import type { GameState } from '../core/GameState';
import type { Game } from '../core/Game';
import { GameSessionState, createGameSession } from '../state/GameSessionState';
import { KnightState, DragonStateData, entityTileX, entityTileY, takeDamage, isAlive } from '../state/EntityState';
import { TileType, TILE_PROPERTIES } from '../config/tileProperties';
import {
  WOOD_WALL_HP, BURNING_WOOD_DURATION, BURNING_WOOD_DAMAGE_PER_SEC,
  DRAGON_FIRE_RANGE,
} from '../config/constants';
import { LevelDefinition } from '../levels/LevelDefinition';
import { level1 } from '../levels/level1';
import { level2 } from '../levels/level2';
import { level3 } from '../levels/level3';
import { generateLevel } from '../levels/LevelGenerator';
import { DetectionSystem } from '../systems/DetectionSystem';
import { VisibilitySystem } from '../systems/VisibilitySystem';
import { CombatSystem } from '../systems/CombatSystem';
import { PowerUpSystem } from '../systems/PowerUpSystem';
import { MovementSystem } from '../systems/MovementSystem';
import { DragonAI } from '../systems/DragonAI';
import { SaveSystem } from '../save/SaveSystem';

import { WorldRenderer } from '../rendering/WorldRenderer';
import { EntityRenderer } from '../rendering/EntityRenderer';
import { EffectRenderer } from '../rendering/EffectRenderer';
import { FogRenderer } from '../rendering/FogRenderer';
import { CameraController } from '../rendering/CameraController';
import { LightingSetup } from '../rendering/LightingSetup';

import { HUD } from '../ui/HUD';
import { FloatingText } from '../ui/FloatingText';
import { MobileControls } from '../ui/MobileControls';
import { PauseOverlay } from '../ui/PauseOverlay';

export class PlayState implements GameState {
  private session!: GameSessionState;
  private detectionSystem!: DetectionSystem;
  private visibilitySystem!: VisibilitySystem;
  private combatSystem!: CombatSystem;
  private powerUpSystem!: PowerUpSystem;
  private movementSystem!: MovementSystem;
  private dragonAI!: DragonAI;
  private saveSystem!: SaveSystem;

  private worldRenderer!: WorldRenderer;
  private entityRenderer!: EntityRenderer;
  private effectRenderer!: EffectRenderer;
  private fogRenderer!: FogRenderer;
  private cameraController!: CameraController;
  private lighting!: LightingSetup;

  private hud!: HUD;
  private floatingText!: FloatingText;
  private mobileControls!: MobileControls;
  private pauseOverlay!: PauseOverlay;

  private damageFlashTimer: number = 0;
  private attackEndTime: number = 0;
  private game!: Game;

  // Callbacks for state transitions
  private onGameOver!: (playerName: string, level: number) => void;
  private onLevelComplete!: (playerName: string, level: number, nextLevel: number) => void;

  constructor(
    onGameOver: (playerName: string, level: number) => void,
    onLevelComplete: (playerName: string, level: number, nextLevel: number) => void
  ) {
    this.onGameOver = onGameOver;
    this.onLevelComplete = onLevelComplete;
  }

  enter(game: Game, data: { playerName: string; level: number; totalTreasures?: number; maxHP?: number; baseAttack?: number }): void {
    this.game = game;
    const levelDef = this.getLevelDefinition(data.level);

    this.session = createGameSession(
      levelDef, data.playerName,
      data.totalTreasures || 0,
      data.maxHP,
      data.baseAttack
    );

    // Systems
    this.detectionSystem = new DetectionSystem(this.session.world.tiles);
    this.visibilitySystem = new VisibilitySystem(
      this.session.world.width, this.session.world.height, this.session.world.tiles
    );
    this.combatSystem = new CombatSystem();
    this.powerUpSystem = new PowerUpSystem();
    this.movementSystem = new MovementSystem();
    this.dragonAI = new DragonAI();
    this.saveSystem = new SaveSystem();

    // Renderers
    this.lighting = new LightingSetup(game.scene);
    this.worldRenderer = new WorldRenderer(game.scene);
    this.worldRenderer.build(this.session.world);

    this.entityRenderer = new EntityRenderer(game.scene);
    this.entityRenderer.buildKnight();
    this.entityRenderer.buildDragon();
    this.entityRenderer.buildTreasures(this.session.world.treasures);

    this.effectRenderer = new EffectRenderer(game.scene);
    this.fogRenderer = new FogRenderer(game.scene);
    this.fogRenderer.build(this.session.world.width, this.session.world.height);

    this.cameraController = new CameraController(game.camera);
    this.cameraController.configureForWorld(this.session.world.width, this.session.world.height);
    this.cameraController.snapToTarget(this.session.knight.x, this.session.knight.y);

    // Add lava lights
    const lavaTiles: { x: number; y: number }[] = [];
    for (let y = 0; y < this.session.world.height; y++) {
      for (let x = 0; x < this.session.world.width; x++) {
        if (this.session.world.tiles[y][x] === TileType.LAVA) {
          lavaTiles.push({ x, y });
        }
      }
    }
    this.lighting.addLavaLights(lavaTiles);

    // Ground plane (large floor under everything)
    // Not needed — InstancedMesh floors cover it

    // UI
    this.hud = new HUD();
    this.hud.show(this.session.level, this.session.levelName, () => {
      this.session.paused = !this.session.paused;
      if (this.session.paused) this.pauseOverlay.show();
      else this.pauseOverlay.hide();
    });
    this.floatingText = new FloatingText(game.camera, game.renderer);
    this.mobileControls = new MobileControls(
      (fx, fy) => {
        this.session.knight.joystickForceX = fx;
        this.session.knight.joystickForceY = fy;
      },
      () => {
        this.session.knight.mobileAttackPressed = true;
      }
    );
    this.pauseOverlay = new PauseOverlay(
      () => { this.session.paused = false; this.pauseOverlay.hide(); },
      () => {
        const save = this.saveSystem.loadGame(this.session.playerName);
        if (save) this.saveSystem.downloadSave(save);
      }
    );

    // Escape to pause
    this.handlePauseKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        this.session.paused = !this.session.paused;
        if (this.session.paused) this.pauseOverlay.show();
        else this.pauseOverlay.hide();
      }
    };
    window.addEventListener('keydown', this.handlePauseKey);
  }

  private handlePauseKey: ((e: KeyboardEvent) => void) | null = null;

  exit(game: Game): void {
    this.worldRenderer.dispose();
    this.entityRenderer.dispose();
    this.effectRenderer.dispose();
    this.fogRenderer.dispose();
    this.lighting.dispose();
    this.hud.hide();
    this.floatingText.dispose();
    this.mobileControls.dispose();
    this.pauseOverlay.hide();

    if (this.handlePauseKey) {
      window.removeEventListener('keydown', this.handlePauseKey);
    }
  }

  update(game: Game, delta: number): void {
    if (this.session.paused) return;

    this.session.time += delta;
    const time = this.session.time;
    const knight = this.session.knight;
    const dragon = this.session.dragon;
    const world = this.session.world;

    // Check end conditions
    if (!isAlive(knight)) {
      this.onGameOver(this.session.playerName, this.session.level);
      return;
    }
    if (!isAlive(dragon)) {
      this.saveLevelComplete();
      this.onLevelComplete(this.session.playerName, this.session.level, this.session.level + 1);
      return;
    }

    // ── Knight input ─────────────────────────────────────
    this.updateKnightInput(game, knight, time);

    // ── Power-ups ────────────────────────────────────────
    this.powerUpSystem.updateKnightPowerUps(knight, time);

    // ── Movement ─────────────────────────────────────────
    this.movementSystem.move(knight, delta, world.tiles, world.width, world.height);
    this.movementSystem.move(dragon, delta, world.tiles, world.width, world.height);

    // ── Detection ────────────────────────────────────────
    const playerDetected = this.detectionSystem.canDetect(
      dragon.x, dragon.y, dragon.facingAngle,
      knight.x, knight.y,
      dragon.fovRange, dragon.fovAngle,
      knight.isCloaked
    );
    const noiseDetected = this.detectionSystem.canHearNoise(
      dragon.x, dragon.y, knight.x, knight.y, knight.isMoving
    );
    const detected = playerDetected || noiseDetected;

    // ── Dragon AI ────────────────────────────────────────
    this.dragonAI.update(
      dragon, time, delta, detected,
      detected ? { x: entityTileX(knight), y: entityTileY(knight) } : undefined
    );
    this.dragonAI.handleSearchFire(dragon, world.tiles);

    // ── Combat ───────────────────────────────────────────
    const dmgDealt = this.combatSystem.knightAttack(knight, dragon);
    if (dmgDealt > 0) {
      this.floatingText.show(dragon.x, 1.0, dragon.y, `-${Math.round(dmgDealt)}`, '#ff4444');
    }

    // Knight attacks wood walls
    if (dmgDealt === 0 && knight.isAttacking && !knight.attackHitProcessed) {
      this.handleWoodWallAttack(knight, world);
    }

    // Dragon fire damage
    const fireDmg = this.combatSystem.dragonFireDamage(dragon, knight, delta);
    if (fireDmg > 0) {
      this.damageFlashTimer = time + 100;
    }

    // Lava damage
    const kTileX = entityTileX(knight);
    const kTileY = entityTileY(knight);
    const knightTile = world.tiles[kTileY]?.[kTileX];
    if (knightTile !== undefined) {
      const props = TILE_PROPERTIES[knightTile];
      if (props.damagePerSec > 0) {
        takeDamage(knight, props.damagePerSec * (delta / 1000));
      }
    }

    // Dragon fire destroying wood walls
    if (this.dragonAI.isFireBreathing(dragon)) {
      this.destroyWoodWallsInFirePath(dragon, world);
    }

    // Update burning tiles
    this.updateBurningTiles(world, time, delta, knight);

    // Power-up collection
    const collected = this.powerUpSystem.checkCollection(knight, world.treasures, time);
    if (collected) {
      this.session.totalTreasures++;
      const labels: Record<string, string> = {
        heal: '+HP', attack_boost: 'ATK UP!', speed_boost: 'SPEED UP!',
        shadow_cloak: 'CLOAKED!', fire_resist: 'FIRE RESIST!', hp_boost: 'MAX HP UP!',
      };
      this.floatingText.show(knight.x, 1.0, knight.y, labels[collected.type] || collected.type, '#ffdd44');
    }

    // ── Visibility (fog of war) ──────────────────────────
    this.visibilitySystem.compute(kTileX, kTileY);

    // ── Rendering ────────────────────────────────────────
    this.worldRenderer.update(delta);
    this.entityRenderer.updateKnight(knight, delta);
    this.entityRenderer.updateDragon(dragon, knight, delta, this.visibilitySystem);
    this.entityRenderer.updateTreasures(world.treasures, delta);
    this.effectRenderer.updateFireBreath(dragon, delta);
    this.effectRenderer.updateFOVCone(dragon, this.detectionSystem, this.visibilitySystem);
    this.effectRenderer.updateBurningTiles(world.burningTiles, time, delta);
    this.fogRenderer.update(this.visibilitySystem);

    // Camera
    this.cameraController.setTarget(knight.x, knight.y);
    this.cameraController.update(world.width, world.height);
    this.lighting.updateDirectionalTarget(knight.x, knight.y);

    // HUD
    this.hud.update(knight, dragon);

    // Floating text
    this.floatingText.update(delta);
  }

  private updateKnightInput(game: Game, knight: KnightState, time: number): void {
    let vx = 0;
    let vy = 0;

    // Keyboard
    if (game.input.left) vx -= 1;
    if (game.input.right) vx += 1;
    if (game.input.up) vy -= 1;
    if (game.input.down) vy += 1;

    // Joystick
    if (knight.joystickForceX !== 0 || knight.joystickForceY !== 0) {
      vx = knight.joystickForceX;
      vy = knight.joystickForceY;
    }

    // Normalize diagonal
    if (vx !== 0 && vy !== 0) {
      const len = Math.sqrt(vx * vx + vy * vy);
      vx /= len;
      vy /= len;
    }

    knight.vx = vx * knight.speed;
    knight.vy = vy * knight.speed;
    knight.isMoving = vx !== 0 || vy !== 0;

    if (knight.isMoving) {
      knight.facingAngle = Math.atan2(vy, vx);
    }

    // Attack
    const attackPressed = game.input.attack || knight.mobileAttackPressed;
    knight.mobileAttackPressed = false;

    if (attackPressed && time > knight.attackCooldown) {
      knight.isAttacking = true;
      knight.attackHitProcessed = false;
      knight.attackCooldown = time + 600;
      this.attackEndTime = time + 300;

      this.entityRenderer.swingSword(knight, game.tweens);
      this.effectRenderer.showSlash(knight, game.tweens);
    }

    // End attack after 300ms (game-time, pauses with game)
    if (knight.isAttacking && this.attackEndTime > 0 && time >= this.attackEndTime) {
      knight.isAttacking = false;
      this.attackEndTime = 0;
    }
  }

  private handleWoodWallAttack(knight: KnightState, world: WorldState): void {
    const dx = Math.round(Math.cos(knight.facingAngle));
    const dy = Math.round(Math.sin(knight.facingAngle));
    const tx = entityTileX(knight) + dx;
    const ty = entityTileY(knight) + dy;
    const key = `${tx},${ty}`;

    if (world.woodWallHP.has(key)) {
      knight.attackHitProcessed = true;
      const hp = world.woodWallHP.get(key)! - 1;
      world.woodWallHP.set(key, hp);

      if (hp <= 0) {
        this.destroyWoodWall(tx, ty, world);
      }
    }
  }

  private destroyWoodWall(tx: number, ty: number, world: WorldState): void {
    world.tiles[ty][tx] = TileType.FLOOR;
    world.woodWallHP.delete(`${tx},${ty}`);
    this.worldRenderer.removeWallInstance(TileType.WOOD_WALL, tx, ty);
    this.worldRenderer.addFloorAt(tx, ty);
    this.detectionSystem.updateTiles(world.tiles);
    this.visibilitySystem.updateTiles(world.tiles);
  }

  private destroyWoodWallsInFirePath(dragon: DragonStateData, world: WorldState): void {
    const range = DRAGON_FIRE_RANGE;
    const angle = dragon.facingAngle;

    for (let d = 1; d <= range; d += 0.5) {
      const px = dragon.x + Math.cos(angle) * d;
      const py = dragon.y + Math.sin(angle) * d;
      const tx = Math.floor(px);
      const ty = Math.floor(py);

      if (ty >= 0 && ty < world.height && tx >= 0 && tx < world.width) {
        if (world.tiles[ty][tx] === TileType.WOOD_WALL) {
          this.igniteWoodWall(tx, ty, world);
        }
      }
    }
  }

  private igniteWoodWall(tx: number, ty: number, world: WorldState): void {
    const key = `${tx},${ty}`;
    if (world.burningTiles.has(key)) return;

    world.burningTiles.set(key, {
      x: tx, y: ty,
      startTime: this.session.time,
    });
  }

  private updateBurningTiles(world: WorldState, time: number, delta: number, knight: KnightState): void {
    for (const [key, bt] of world.burningTiles) {
      const elapsed = time - bt.startTime;
      if (elapsed >= BURNING_WOOD_DURATION) {
        world.burningTiles.delete(key);
        this.destroyWoodWall(bt.x, bt.y, world);
      }
    }

    // Burning tile damage to knight
    if (world.burningTiles.size > 0) {
      const ktx = entityTileX(knight);
      const kty = entityTileY(knight);

      for (const bt of world.burningTiles.values()) {
        const dx = Math.abs(ktx - bt.x);
        const dy = Math.abs(kty - bt.y);
        if (dx <= 1 && dy <= 1) {
          let damage = BURNING_WOOD_DAMAGE_PER_SEC * (delta / 1000);
          if (knight.hasFireResist) {
            damage *= knight.fireResistMultiplier;
          }
          takeDamage(knight, damage);
          this.damageFlashTimer = time + 100;
          break;
        }
      }
    }
  }

  private saveLevelComplete(): void {
    const s = this.session;
    const save = this.saveSystem.loadGame(s.playerName) || {
      playerName: s.playerName,
      currentLevel: 1,
      levelsCompleted: 0,
      totalTreasures: 0,
      maxHP: s.knight.maxHP,
      baseAttackPower: s.knight.baseAttackPower,
      timestamp: Date.now(),
    };

    save.currentLevel = s.level + 1;
    save.levelsCompleted = Math.max(save.levelsCompleted, s.level);
    save.totalTreasures = s.totalTreasures;
    save.maxHP = s.knight.maxHP;
    save.baseAttackPower = s.knight.baseAttackPower;
    this.saveSystem.saveGame(save);
  }

  private getLevelDefinition(level: number): LevelDefinition {
    switch (level) {
      case 1: return level1;
      case 2: return level2;
      case 3: return level3;
      default: return generateLevel(level);
    }
  }
}

// Re-export WorldState for use in type annotations
import type { WorldState } from '../state/WorldState';
