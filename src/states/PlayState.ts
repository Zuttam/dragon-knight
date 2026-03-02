import type { GameState } from '../core/GameState';
import type { Game } from '../core/Game';
import { GameSessionState, createGameSession } from '../state/GameSessionState';
import { KnightState, DragonStateData, DragonAIState, PowerUpType, WizardDialogStatus, createWizardState, entityTileX, entityTileY, takeDamage, isAlive } from '../state/EntityState';
import { TileType, TILE_PROPERTIES } from '../config/tileProperties';
import {
  WOOD_WALL_HP, BURNING_WOOD_DURATION, BURNING_WOOD_DAMAGE_PER_SEC,
  DRAGON_FIRE_RANGE, DRAGON_ALERT_DURATION,
} from '../config/constants';
import { LevelDefinition } from '../levels/LevelDefinition';
import { level1 } from '../levels/level1';
import { level2 } from '../levels/level2';
import { level3 } from '../levels/level3';
import { generateLevel } from '../levels/LevelGenerator';
import { padLevelToScreen } from '../levels/LevelScaler';
import { DetectionSystem } from '../systems/DetectionSystem';
import { VisibilitySystem } from '../systems/VisibilitySystem';
import { CombatSystem } from '../systems/CombatSystem';
import { PowerUpSystem } from '../systems/PowerUpSystem';
import { MovementSystem } from '../systems/MovementSystem';
import { DragonAI } from '../systems/DragonAI';
import { WizardInteractionSystem } from '../systems/WizardInteractionSystem';
import { WizardChatSystem } from '../systems/WizardChatSystem';
import { SaveSystem, UserSettings } from '../save/SaveSystem';
import { musicStore } from '../audio/MusicStore';
import { musicManager } from '../audio/MusicManager';
import { t } from '../i18n';
import { distance } from '../core/MathUtils';

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
import { WizardChatOverlay } from '../ui/WizardChatOverlay';

export class PlayState implements GameState {
  private session!: GameSessionState;
  private settings!: UserSettings;
  private detectionSystem!: DetectionSystem;
  private visibilitySystem!: VisibilitySystem;
  private combatSystem!: CombatSystem;
  private powerUpSystem!: PowerUpSystem;
  private movementSystem!: MovementSystem;
  private dragonAI!: DragonAI;
  private saveSystem!: SaveSystem;

  // Wizard systems
  private wizardInteraction!: WizardInteractionSystem;
  private wizardChat!: WizardChatSystem;
  private wizardChatOverlay!: WizardChatOverlay;
  private wizardPromptEl: HTMLElement | null = null;
  private wizardChatOpen: boolean = false;

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
  private onGameOver!: (settings: UserSettings, level: number) => void;
  private onLevelComplete!: (settings: UserSettings, level: number, nextLevel: number) => void;
  private onExitDungeon!: () => void;

  constructor(
    onGameOver: (settings: UserSettings, level: number) => void,
    onLevelComplete: (settings: UserSettings, level: number, nextLevel: number) => void,
    onExitDungeon: () => void
  ) {
    this.onGameOver = onGameOver;
    this.onLevelComplete = onLevelComplete;
    this.onExitDungeon = onExitDungeon;
  }

  enter(game: Game, data: { settings: UserSettings; level: number; totalTreasures?: number; maxHP?: number; baseAttack?: number }): void {
    this.game = game;
    this.settings = data.settings;
    const levelDef = this.getLevelDefinition(data.level);

    // Create wizard state if level has a wizard spawn and wizard is enabled
    const wizardSpawnEnabled = this.settings.wizardEnabled !== false;
    const wizardState = levelDef.wizardSpawn && wizardSpawnEnabled
      ? createWizardState(levelDef.wizardSpawn.x, levelDef.wizardSpawn.y, levelDef.level)
      : null;

    this.session = createGameSession(
      levelDef, data.settings.playerName,
      data.totalTreasures || 0,
      data.maxHP,
      data.baseAttack,
      data.settings.language,
      data.settings.ageRange,
      wizardState
    );

    // Translate level name
    this.session.levelName = this.getTranslatedLevelName(data.level, levelDef);

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

    // Wizard systems
    this.wizardInteraction = new WizardInteractionSystem();
    this.wizardChat = new WizardChatSystem();
    this.wizardChat.loadFromSettings(this.settings);

    // Match clear color to wall tiles so any sub-tile gap at screen edges is invisible
    game.renderer.setClearColor(0x111118);

    // Renderers
    this.lighting = new LightingSetup(game.scene);
    this.worldRenderer = new WorldRenderer(game.scene);
    this.worldRenderer.build(this.session.world);

    this.entityRenderer = new EntityRenderer(game.scene);
    this.entityRenderer.buildKnight();
    this.entityRenderer.buildDragon();
    this.entityRenderer.buildTreasures(this.session.world.treasures);

    // Build wizard if present
    if (this.session.wizard) {
      this.entityRenderer.buildWizard();
    }

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
        this.saveSystem.downloadFullExport(this.settings);
      },
      () => { this.onExitDungeon(); },
      (enabled, volume) => {
        this.settings.musicEnabled = enabled;
        this.settings.musicVolume = volume;
        this.saveSystem.saveSettings(this.settings);
      },
      async (trackIndex) => {
        if (trackIndex >= 0) {
          const blob = await musicStore.getTrackBlob(this.settings.playerName, trackIndex);
          if (blob) {
            const url = URL.createObjectURL(blob);
            musicManager.setTrack(trackIndex, url);
          }
        } else {
          musicManager.setTrack(-1, null);
        }
        this.settings.activeTrack = trackIndex;
        this.saveSystem.saveSettings(this.settings);
      }
    );
    this.pauseOverlay.setTrackInfo(this.settings.customTracks || []);

    // Wizard chat overlay
    this.wizardChatOverlay = new WizardChatOverlay(
      // onSend
      (message) => {
        this.wizardChat.sendMessage(message).then(() => {
          this.wizardChatOverlay.updateMessages(this.wizardChat.state);

          // Check if riddle was answered correctly
          if (this.wizardChat.state.riddleCorrect && this.session.wizard) {
            this.session.wizard.riddleAnswered = true;
            this.session.wizard.dialogStatus = WizardDialogStatus.COMPLETED;

            // Apply wizard reward
            const rewardType = this.powerUpSystem.applyWizardReward(
              this.session.knight, this.session.time, this.session.level
            );
            const labels: Partial<Record<PowerUpType, string>> = {
              [PowerUpType.HEAL]: t('floating.healWizard'), [PowerUpType.ATTACK_BOOST]: t('floating.wizardAtk'), [PowerUpType.SPEED_BOOST]: t('floating.wizardSpeed'),
              [PowerUpType.SHADOW_CLOAK]: t('floating.wizardCloak'), [PowerUpType.FIRE_RESIST]: t('floating.wizardFireShield'), [PowerUpType.HP_BOOST]: t('floating.wizardMaxHP'),
            };
            this.floatingText.show(
              this.session.knight.x, 1.0, this.session.knight.y,
              labels[rewardType] || t('floating.wizardGift'), '#cc88ff'
            );

            // Auto-close after 2 seconds
            setTimeout(() => {
              this.closeWizardChat();
            }, 2000);
          }
        });
        this.wizardChatOverlay.updateMessages(this.wizardChat.state);
      },
      // onClose
      () => {
        this.closeWizardChat();
      },
      // onApiKeySubmit
      (provider, apiKey, model) => {
        this.wizardChat.setProvider(provider, apiKey, model);
        // Persist to profile settings
        this.settings.llmProvider = provider;
        this.settings.llmApiKey = apiKey;
        this.settings.llmModel = model;
        this.saveSystem.saveSettings(this.settings);
        this.wizardChatOverlay.hide();
        this.openWizardChat();
      }
    );

    // Wizard proximity prompt
    this.wizardPromptEl = document.createElement('div');
    this.wizardPromptEl.className = 'wizard-prompt';
    this.wizardPromptEl.style.display = 'none';
    document.body.appendChild(this.wizardPromptEl);

    // Escape handler
    this.handlePauseKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        // Close wizard chat first if open
        if (this.wizardChatOpen) {
          this.closeWizardChat();
          return;
        }
        this.session.paused = !this.session.paused;
        if (this.session.paused) this.pauseOverlay.show();
        else this.pauseOverlay.hide();
      }
    };
    window.addEventListener('keydown', this.handlePauseKey);
  }

  private handlePauseKey: ((e: KeyboardEvent) => void) | null = null;

  exit(game: Game): void {
    game.renderer.setClearColor(0x1a1a2e);
    this.worldRenderer.dispose();
    this.entityRenderer.dispose();
    this.effectRenderer.dispose();
    this.fogRenderer.dispose();
    this.cameraController.dispose();
    this.lighting.dispose();
    this.hud.hide();
    this.floatingText.dispose();
    this.mobileControls.dispose();
    this.pauseOverlay.hide();

    // Wizard cleanup
    this.wizardChatOverlay.hide();
    this.wizardChat.cancelPending();
    if (this.wizardPromptEl) {
      this.wizardPromptEl.remove();
      this.wizardPromptEl = null;
    }

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
      this.onGameOver(this.settings, this.session.level);
      return;
    }
    if (!isAlive(dragon)) {
      this.saveLevelComplete();
      this.onLevelComplete(this.settings, this.session.level, this.session.level + 1);
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
    if (detected && !dragon.hasBeenRevealed) {
      dragon.hasBeenRevealed = true;
    }

    // ── Dragon AI ────────────────────────────────────────
    this.dragonAI.update(
      dragon, time, delta, detected,
      detected ? { x: entityTileX(knight), y: entityTileY(knight) } : undefined,
      world.tiles, world.width, world.height
    );
    this.dragonAI.handleSearchFire(dragon, world.tiles);

    // ── Wizard interaction ────────────────────────────────
    this.updateWizardInteraction(game, knight, dragon);

    // ── Combat ───────────────────────────────────────────
    const dmgDealt = this.combatSystem.knightAttack(knight, dragon);
    if (dmgDealt > 0) {
      this.floatingText.show(dragon.x, 1.0, dragon.y, `-${Math.round(dmgDealt)}`, '#ff4444');
      // Wake dragon if attacked while sleeping
      if (dragon.aiState === DragonAIState.SLEEP) {
        dragon.aiState = DragonAIState.ALERT;
        dragon.alertTimer = time + DRAGON_ALERT_DURATION;
        dragon.lastKnownPlayerPos = { x: entityTileX(knight), y: entityTileY(knight) };
      }
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
      const labels: Partial<Record<PowerUpType, string>> = {
        [PowerUpType.HEAL]: t('floating.heal'), [PowerUpType.ATTACK_BOOST]: t('floating.atkUp'), [PowerUpType.SPEED_BOOST]: t('floating.speedUp'),
        [PowerUpType.SHADOW_CLOAK]: t('floating.cloaked'), [PowerUpType.FIRE_RESIST]: t('floating.fireResist'), [PowerUpType.HP_BOOST]: t('floating.maxHpUp'),
      };
      this.floatingText.show(knight.x, 1.0, knight.y, labels[collected.type] || collected.type, '#ffdd44');
    }

    // ── Torch interaction ──────────────────────────────────
    const nearTorch = this.findNearestTorch(knight, world);
    this.handleTorchInteraction(game, knight, world, nearTorch);

    // ── Visibility (fog of war) ──────────────────────────
    this.visibilitySystem.compute(kTileX, kTileY);

    // ── Dragon wake-up ─────────────────────────────────
    if (dragon.aiState === DragonAIState.SLEEP) {
      const dtx = entityTileX(dragon);
      const dty = entityTileY(dragon);
      if (this.visibilitySystem.visible[dty]?.[dtx]) {
        dragon.aiState = DragonAIState.PATROL;
      }
    }

    // ── Rendering ────────────────────────────────────────
    this.worldRenderer.update(delta);
    this.entityRenderer.updateKnight(knight, delta);
    this.entityRenderer.updateDragon(dragon, knight, delta, this.visibilitySystem);
    this.entityRenderer.updateTreasures(world.treasures, delta);

    // Update wizard rendering
    if (this.session.wizard) {
      this.entityRenderer.updateWizard(this.session.wizard, knight, delta, this.visibilitySystem);
    }

    this.effectRenderer.updateFireBreath(dragon, delta);
    this.effectRenderer.updateFOVCone(dragon, this.detectionSystem, this.visibilitySystem);
    this.effectRenderer.updateBurningTiles(world.burningTiles, time, delta);
    this.effectRenderer.updateCrackParticles(delta);
    this.fogRenderer.update(this.visibilitySystem);

    // Camera
    this.cameraController.setTarget(knight.x, knight.y);
    this.cameraController.update(world.width, world.height);
    this.lighting.updateDirectionalTarget(knight.x, knight.y);

    // HUD
    const wizardBusy = this.session.wizard?.dialogStatus === WizardDialogStatus.AVAILABLE
      || this.session.wizard?.dialogStatus === WizardDialogStatus.DRAGON_NEARBY;
    this.hud.update(knight, dragon, nearTorch !== null && !wizardBusy);

    // Floating text
    this.floatingText.update(delta);
  }

  // ── Wizard ──────────────────────────────────────────────

  private updateWizardInteraction(game: Game, knight: KnightState, dragon: DragonStateData): void {
    const wizard = this.session.wizard;
    if (!wizard || wizard.riddleAnswered) {
      if (this.wizardPromptEl) this.wizardPromptEl.style.display = 'none';
      return;
    }

    // Update wizard status
    this.wizardInteraction.update(wizard, knight, dragon);

    // During active chat, check if dragon approached
    if (this.wizardChatOpen) {
      if (!this.wizardInteraction.isChatSafe(wizard, dragon)) {
        // Force close chat
        wizard.dialogStatus = WizardDialogStatus.DRAGON_NEARBY;
        this.closeWizardChat();
        this.floatingText.show(wizard.x, 1.5, wizard.y, t('floating.dangerApproaches'), '#ff4444');
      }
      return;
    }

    // Show/hide proximity prompt
    if (this.wizardPromptEl) {
      switch (wizard.dialogStatus) {
        case WizardDialogStatus.AVAILABLE:
          this.wizardPromptEl.textContent = t('wizard.speakPrompt');
          this.wizardPromptEl.style.display = 'block';
          break;
        case WizardDialogStatus.DRAGON_NEARBY:
          this.wizardPromptEl.textContent = t('wizard.dangerNearby');
          this.wizardPromptEl.style.display = 'block';
          break;
        default:
          this.wizardPromptEl.style.display = 'none';
      }
    }

    // E key to interact when available
    if (game.input.interact && wizard.dialogStatus === WizardDialogStatus.AVAILABLE) {
      this.openWizardChat();
    }
  }

  private openWizardChat(): void {
    const wizard = this.session.wizard;
    if (!wizard) return;

    this.wizardChatOpen = true;
    wizard.dialogStatus = WizardDialogStatus.CHATTING;
    this.session.paused = true;

    if (this.wizardPromptEl) this.wizardPromptEl.style.display = 'none';

    const needsApiKey = !this.wizardChat.hasApiKey();
    this.wizardChatOverlay.show(needsApiKey);

    if (!needsApiKey) {
      this.wizardChat.startChat(
        this.session.level,
        this.session.language,
        this.session.ageRange
      ).then(() => {
        this.wizardChatOverlay.updateMessages(this.wizardChat.state);
      });
      this.wizardChatOverlay.updateMessages(this.wizardChat.state);
    }
  }

  private closeWizardChat(): void {
    this.wizardChatOpen = false;
    this.session.paused = false;
    this.wizardChat.cancelPending();
    this.wizardChatOverlay.hide();

    const wizard = this.session.wizard;
    if (wizard && !wizard.riddleAnswered && wizard.dialogStatus === WizardDialogStatus.CHATTING) {
      wizard.dialogStatus = WizardDialogStatus.AVAILABLE;
    }
  }

  // ── Knight Input ────────────────────────────────────────

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

      // Visual damage feedback
      this.worldRenderer.tintWoodWallInstance(tx, ty, hp);
      this.effectRenderer.updateWoodWallDamage(tx, ty, hp);
      if (hp === 1) {
        this.worldRenderer.shrinkWoodWallInstance(tx, ty, 0.92);
      }
      this.floatingText.show(tx + 0.5, 1.0, ty + 0.5, t('floating.crack'), '#ccaa66');

      if (hp <= 0) {
        this.destroyWoodWall(tx, ty, world);
      }
    }
  }

  private destroyWoodWall(tx: number, ty: number, world: WorldState): void {
    this.effectRenderer.updateWoodWallDamage(tx, ty, 0);
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

  private findNearestTorch(knight: KnightState, world: WorldState): { index: number; torch: import('../state/WorldState').TorchState } | null {
    let nearest: { index: number; torch: import('../state/WorldState').TorchState } | null = null;
    let minDist = 1.5;

    for (let i = 0; i < world.torches.length; i++) {
      const t = world.torches[i];
      const dist = distance(knight.x, knight.y, t.x + 0.5, t.y + 0.5);
      if (dist < minDist) {
        minDist = dist;
        nearest = { index: i, torch: t };
      }
    }

    return nearest;
  }

  private handleTorchInteraction(
    game: Game, knight: KnightState, world: WorldState,
    nearest: { index: number; torch: import('../state/WorldState').TorchState } | null
  ): void {
    if (!game.input.interact) return;

    // Don't toggle torch if wizard interaction took priority
    if (this.session.wizard && this.session.wizard.dialogStatus === WizardDialogStatus.AVAILABLE) return;

    if (!nearest) return;

    nearest.torch.lit = !nearest.torch.lit;
    this.worldRenderer.updateTorchStates(world.torches);

    const label = nearest.torch.lit ? t('floating.lit') : t('floating.extinguished');
    const color = nearest.torch.lit ? '#ffaa44' : '#8888aa';
    this.floatingText.show(
      nearest.torch.x + 0.5, 1.0, nearest.torch.y + 0.5,
      label, color
    );
  }

  private getTranslatedLevelName(level: number, def: LevelDefinition): string {
    switch (level) {
      case 1: return t('level.entranceHall');
      case 2: return t('level.grandCorridor');
      case 3: return t('level.burningKeep');
      default: return t('level.castleDepths', { level });
    }
  }

  private getLevelDefinition(level: number): LevelDefinition {
    let def: LevelDefinition;
    switch (level) {
      case 1: def = level1; break;
      case 2: def = level2; break;
      case 3: def = level3; break;
      default: def = generateLevel(level); break;
    }
    return padLevelToScreen(def);
  }
}

// Re-export WorldState for use in type annotations
import type { WorldState } from '../state/WorldState';
