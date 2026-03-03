import * as THREE from 'three';
import type { GameState } from '../core/GameState';
import type { Game } from '../core/Game';
import { GameSessionState, createGameSession } from '../state/GameSessionState';
import { switchFloor, FurnitureType } from '../state/WorldState';
import { KnightState, DragonStateData, DragonAIState, PowerUpType, WizardDialogStatus, createWizardState, entityTileX, entityTileY, takeDamage, isAlive, heal } from '../state/EntityState';
import type { RewardItem } from '../rewards/RewardItem';
import { TileType, TILE_PROPERTIES } from '../config/tileProperties';
import {
  WOOD_WALL_HP, BURNING_WOOD_DURATION, BURNING_WOOD_DAMAGE_PER_SEC,
  DRAGON_FIRE_RANGE, DRAGON_ALERT_DURATION, WARDROBE_INTERACT_RANGE,
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
import { PauseOverlay, type CameraModeOption } from '../ui/PauseOverlay';
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
  private rewardHPBonus: number = 0;
  private game!: Game;
  private stairCooldown: number = 0;

  // Visibility tile-position cache (skip recompute when knight hasn't moved tiles)
  private lastVisTileX: number = -1;
  private lastVisTileY: number = -1;

  // FPS camera mode
  private isFirstPerson: boolean = false;
  private isLockedCamera: boolean = false;
  private crosshairEl: HTMLElement | null = null;
  private pointerLockHandler: (() => void) | null = null;

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

  enter(game: Game, data: { settings: UserSettings; level: number; totalTreasures?: number; maxHP?: number; baseAttack?: number; reward?: RewardItem }): void {
    this.game = game;
    this.settings = data.settings;
    const levelDef = this.getLevelDefinition(data.level);

    // Create wizard state if level has a wizard spawn
    const wizardState = levelDef.wizardSpawn
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

    // Apply level reward if present
    this.rewardHPBonus = 0;
    if (data.reward) {
      this.applyReward(data.reward, this.session.knight);
    }

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

    this.cameraController = new CameraController(game.orthoCamera, game.perspCamera);
    this.cameraController.configureForWorld(this.session.world.width, this.session.world.height);
    this.cameraController.snapToTarget(this.session.knight.x, this.session.knight.y);

    // Add perspCamera to scene so its children (FPS sword) render
    game.scene.add(game.perspCamera);
    this.entityRenderer.buildFPSSword(game.perspCamera);

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
      () => {
        this.session.paused = false;
        this.pauseOverlay.hide();
        // Flush any mouse deltas accumulated while paused
        game.input.consumeMouseDelta();
        // Re-request pointer lock when resuming in free-look FPS
        if (this.isFirstPerson && !this.isLockedCamera) {
          game.input.requestPointerLock(game.renderer.domElement);
        }
      },
      () => {
        this.saveSystem.downloadFullExport(this.settings);
      },
      () => { this.onExitDungeon(); },
      (enabled, volume) => {
        this.settings.musicEnabled = enabled;
        this.settings.musicVolume = volume;
        this.saveSystem.saveSettings(this.settings);
      },
      (trackIndex) => {
        musicManager.jumpTo(trackIndex);
        this.settings.activeTrack = trackIndex;
        this.saveSystem.saveSettings(this.settings);
      },
      (mode) => {
        this.setCameraMode(mode);
      },
      (revealed) => {
        this.visibilitySystem.revealAll = revealed;
        this.settings.revealMap = revealed;
        this.saveSystem.saveSettings(this.settings);
        // Update FPS lighting when reveal map changes
        if (this.isFirstPerson) {
          this.applyFPSLighting();
        }
      }
    );
    this.pauseOverlay.setTrackInfo(this.settings.customTracks || []);

    // Load saved reveal map setting
    if (data.settings.revealMap) {
      this.visibilitySystem.revealAll = true;
      this.pauseOverlay.setRevealMap(true);
    }

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

    // Crosshair element (hidden by default)
    this.crosshairEl = document.createElement('div');
    this.crosshairEl.className = 'fps-crosshair';
    this.crosshairEl.style.display = 'none';
    document.body.appendChild(this.crosshairEl);

    // Pointer lock change handler (involuntary exit = pause in free-look FPS)
    this.pointerLockHandler = () => {
      if (this.isFirstPerson && !this.isLockedCamera && !document.pointerLockElement && !this.session.paused && !this.wizardChatOpen) {
        this.session.paused = true;
        this.pauseOverlay.show();
      }
    };
    document.addEventListener('pointerlockchange', this.pointerLockHandler);

    // Escape handler
    this.handlePauseKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        // Close wizard chat first if open
        if (this.wizardChatOpen) {
          this.closeWizardChat();
          return;
        }
        // In free-look FPS, browser exits pointer lock on Escape, which triggers pause via pointerlockchange.
        // If already paused (from pointer lock exit), don't toggle.
        if (this.isFirstPerson && !this.isLockedCamera && !this.session.paused) {
          // Let the browser handle Escape -> pointer lock exit -> pause via handler
          return;
        }
        this.session.paused = !this.session.paused;
        if (this.session.paused) {
          this.pauseOverlay.show();
        } else {
          this.pauseOverlay.hide();
          // Flush any mouse deltas accumulated while paused
          game.input.consumeMouseDelta();
          if (this.isFirstPerson && !this.isLockedCamera) {
            game.input.requestPointerLock(game.renderer.domElement);
          }
        }
      }
    };
    window.addEventListener('keydown', this.handlePauseKey);

    // Load saved camera mode
    const savedMode = data.settings.cameraMode;
    if (savedMode && savedMode !== 'thirdPerson' && !('ontouchstart' in window)) {
      // Defer to after first frame so everything is initialized
      setTimeout(() => {
        this.setCameraMode(savedMode);
        // requestPointerLock requires a user gesture; add a one-time click handler
        if (savedMode === 'firstPerson') {
          const handler = () => {
            if (this.isFirstPerson && !this.isLockedCamera && !document.pointerLockElement) {
              game.input.requestPointerLock(game.renderer.domElement);
            }
            game.renderer.domElement.removeEventListener('click', handler);
          };
          game.renderer.domElement.addEventListener('click', handler);
        }
      }, 0);
    }
  }

  private handlePauseKey: ((e: KeyboardEvent) => void) | null = null;

  exit(game: Game): void {
    game.renderer.setClearColor(0x1a1a2e);

    // Restore ortho camera and clean up FPS state
    if (this.isFirstPerson) {
      game.setActiveCamera('ortho');
      game.scene.fog = null;
      game.input.exitPointerLock();
    }

    // Remove perspCamera from scene (and its FPS sword child)
    game.scene.remove(game.perspCamera);

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

    // FPS cleanup
    if (this.crosshairEl) {
      this.crosshairEl.remove();
      this.crosshairEl = null;
    }
    if (this.pointerLockHandler) {
      document.removeEventListener('pointerlockchange', this.pointerLockHandler);
      this.pointerLockHandler = null;
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
    this.updateKnightInput(game, knight, time, delta);

    // ── Power-ups ────────────────────────────────────────
    this.powerUpSystem.updateKnightPowerUps(knight, time);

    // ── Movement ─────────────────────────────────────────
    // Skip movement while hiding in wardrobe
    if (!knight.isHidingInWardrobe) {
      this.movementSystem.move(knight, delta, world.tiles, world.width, world.height, world.furnitureBlocked);
    }

    // Dragon only moves on floor 0
    if (world.currentFloor === 0) {
      this.movementSystem.move(dragon, delta, world.tiles, world.width, world.height, world.furnitureBlocked);
    }

    // ── Stair transition ─────────────────────────────────
    this.handleStairTransition(game, knight, world, time);

    // ── Detection ────────────────────────────────────────
    // Skip detection when player is on a different floor from dragon
    const playerOnDragonFloor = world.currentFloor === 0;
    const playerDetected = playerOnDragonFloor && !knight.isHidingInWardrobe && this.detectionSystem.canDetect(
      dragon.x, dragon.y, dragon.facingAngle,
      knight.x, knight.y,
      dragon.fovRange, dragon.fovAngle,
      knight.isCloaked
    );
    const noiseDetected = playerOnDragonFloor && !knight.isHidingInWardrobe && this.detectionSystem.canHearNoise(
      dragon.x, dragon.y, knight.x, knight.y, knight.isMoving
    );
    const detected = playerDetected || noiseDetected;
    if (detected && !dragon.hasBeenRevealed) {
      dragon.hasBeenRevealed = true;
    }

    // ── Dragon AI ────────────────────────────────────────
    // Dragon AI and combat only run when dragon is on the same floor as the player
    if (playerOnDragonFloor) {
      this.dragonAI.update(
        dragon, time, delta, detected,
        detected ? { x: entityTileX(knight), y: entityTileY(knight) } : undefined,
        world.tiles, world.width, world.height,
        world.furnitureBlocked
      );
      this.dragonAI.handleSearchFire(dragon, world.tiles);
    }

    // ── Wizard interaction ────────────────────────────────
    this.updateWizardInteraction(game, knight, dragon);

    // ── Combat ───────────────────────────────────────────
    const dmgDealt = playerOnDragonFloor ? this.combatSystem.knightAttack(knight, dragon) : 0;
    if (dmgDealt > 0) {
      this.floatingText.show(dragon.x, 1.0, dragon.y, `-${Math.round(dmgDealt)}`, '#ff4444');
      // Wake dragon if attacked while sleeping
      if (dragon.aiState === DragonAIState.SLEEP) {
        dragon.aiState = DragonAIState.ALERT;
        dragon.alertTimer = time + DRAGON_ALERT_DURATION;
        dragon.lastKnownPlayerPos = { x: entityTileX(knight), y: entityTileY(knight) };
      }
    }

    // Knight attacks wood walls or wardrobes
    if (dmgDealt === 0 && knight.isAttacking && !knight.attackHitProcessed) {
      this.handleWoodWallAttack(knight, world);
      if (!knight.attackHitProcessed) {
        this.handleWardrobeAttack(knight, world);
      }
    }

    // Dragon fire damage
    const fireDmg = playerOnDragonFloor ? this.combatSystem.dragonFireDamage(dragon, knight, delta) : 0;
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

    // ── Wardrobe interaction ───────────────────────────────
    const nearWardrobe = this.findNearestWardrobe(knight, world);
    this.handleWardrobeInteraction(game, knight, world, nearWardrobe);

    // ── Torch interaction ──────────────────────────────────
    const nearTorch = this.findNearestTorch(knight, world);
    this.handleTorchInteraction(game, knight, world, nearTorch);

    // ── Visibility (fog of war) ──────────────────────────
    const visMoved = kTileX !== this.lastVisTileX || kTileY !== this.lastVisTileY;
    if (visMoved) {
      this.visibilitySystem.compute(kTileX, kTileY);
      this.lastVisTileX = kTileX;
      this.lastVisTileY = kTileY;
    }

    // ── Dragon wake-up ─────────────────────────────────
    if (dragon.aiState === DragonAIState.SLEEP) {
      const dtx = entityTileX(dragon);
      const dty = entityTileY(dragon);
      if (this.visibilitySystem.isVisible(dtx, dty)) {
        dragon.aiState = DragonAIState.PATROL;
      }
    }

    // ── Mouse look (FPS) ──────────────────────────────────
    if (this.isFirstPerson) {
      if (this.isLockedCamera) {
        // Locked mode: camera always follows movement direction
        this.cameraController.setYawFromFacingAngle(knight.facingAngle);
      } else {
        const { dx, dy } = game.input.consumeMouseDelta();
        if (dx !== 0 || dy !== 0) {
          this.cameraController.applyMouseLook(dx, dy);
        }
      }
    }

    // ── Rendering ────────────────────────────────────────
    this.worldRenderer.update(delta, knight.x + 0.5, knight.y + 0.5);
    this.entityRenderer.updateKnight(knight, delta, this.isFirstPerson);

    // Dragon is only visible on floor 0
    if (playerOnDragonFloor) {
      this.entityRenderer.setDragonVisible(true);
      this.entityRenderer.updateDragon(dragon, knight, delta, this.visibilitySystem);
    } else {
      this.entityRenderer.setDragonVisible(false);
    }
    this.entityRenderer.updateTreasures(world.treasures, delta);

    // Update wizard rendering — wizard stays on its spawn floor
    if (this.session.wizard) {
      if (playerOnDragonFloor) {
        this.entityRenderer.setWizardVisible(true);
        this.entityRenderer.updateWizard(this.session.wizard, knight, delta, this.visibilitySystem);
      } else {
        this.entityRenderer.setWizardVisible(false);
      }
    }

    if (playerOnDragonFloor) {
      this.effectRenderer.updateFireBreath(dragon, delta);
      this.effectRenderer.updateFOVCone(dragon, this.detectionSystem, this.visibilitySystem);
    }
    this.effectRenderer.updateBurningTiles(world.burningTiles, time, delta);
    this.effectRenderer.updateCrackParticles(delta);
    if (!this.isFirstPerson && visMoved) {
      this.fogRenderer.update(this.visibilitySystem);
    }

    // Camera
    this.cameraController.setTarget(knight.x, knight.y);
    this.cameraController.update(world.width, world.height);
    this.lighting.updateDirectionalTarget(knight.x, knight.y);

    // HUD
    const wizardBusy = this.session.wizard?.dialogStatus === WizardDialogStatus.AVAILABLE
      || this.session.wizard?.dialogStatus === WizardDialogStatus.DRAGON_NEARBY;
    let interactPromptText: string | undefined;
    if (knight.isHidingInWardrobe) {
      interactPromptText = t('hud.exitWardrobePrompt');
    } else if (nearWardrobe) {
      interactPromptText = t('hud.wardrobePrompt');
    } else if (nearTorch !== null && !wizardBusy) {
      interactPromptText = t('hud.torchPrompt');
    }
    this.hud.update(knight, dragon, interactPromptText);

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

  // ── Camera Mode ──────────────────────────────────────────

  private setCameraMode(mode: CameraModeOption): void {
    const game = this.game;
    this.isFirstPerson = mode === 'firstPerson' || mode === 'firstPersonLocked';
    this.isLockedCamera = mode === 'firstPersonLocked';

    if (this.isFirstPerson) {
      // Switch to perspective camera
      game.setActiveCamera('perspective');
      this.cameraController.setMode('firstPerson');
      this.cameraController.initFPSFromFacingAngle(this.session.knight.facingAngle);

      // Flush any accumulated mouse deltas from before mode switch
      game.input.consumeMouseDelta();

      // Fog: hide tile-based fog, add distance fog
      this.fogRenderer.setVisible(false);
      this.applyFPSLighting();

      // Request pointer lock only for free-look FPS (not locked)
      if (!this.isLockedCamera) {
        game.input.requestPointerLock(game.renderer.domElement);
      } else {
        game.input.exitPointerLock();
      }

      // Show crosshair
      if (this.crosshairEl) this.crosshairEl.style.display = 'block';
    } else {
      // Switch to ortho camera
      game.setActiveCamera('ortho');
      this.cameraController.setMode('thirdPerson');

      // Fog: show tile-based fog, remove distance fog
      this.fogRenderer.setVisible(true);
      game.scene.fog = null;

      // Restore default lighting levels
      this.lighting.ambient.intensity = 0.55;
      this.lighting.directional.intensity = 0.5;

      // Release pointer lock
      game.input.exitPointerLock();

      // Hide crosshair
      if (this.crosshairEl) this.crosshairEl.style.display = 'none';
    }

    // Update floating text camera reference
    this.floatingText.setCamera(game.camera);

    // Save preference
    this.settings.cameraMode = mode;
    this.saveSystem.saveSettings(this.settings);

    // Update pause overlay state
    this.pauseOverlay.setCameraMode(mode);
  }

  /** Apply FPS fog and lighting — brighter when reveal map is on. */
  private applyFPSLighting(): void {
    const game = this.game;
    if (this.visibilitySystem.revealAll) {
      // Reveal mode: much less fog, brighter scene
      game.scene.fog = new THREE.FogExp2(0x1a1a2e, 0.04);
      this.lighting.ambient.intensity = 1.2;
      this.lighting.directional.intensity = 1.0;
    } else {
      // Normal FPS: standard dark dungeon fog
      game.scene.fog = new THREE.FogExp2(0x1a1a2e, 0.15);
      this.lighting.ambient.intensity = 0.55;
      this.lighting.directional.intensity = 0.5;
    }
  }

  private openWizardChat(): void {
    const wizard = this.session.wizard;
    if (!wizard) return;

    this.wizardChatOpen = true;
    wizard.dialogStatus = WizardDialogStatus.CHATTING;
    this.session.paused = true;

    // Release pointer lock for typing (only in free-look FPS)
    if (this.isFirstPerson && !this.isLockedCamera) {
      this.game.input.exitPointerLock();
    }

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

    // Re-request pointer lock in free-look FPS
    if (this.isFirstPerson && !this.isLockedCamera) {
      this.game.input.requestPointerLock(this.game.renderer.domElement);
    }
  }

  // ── Knight Input ────────────────────────────────────────

  private updateKnightInput(game: Game, knight: KnightState, time: number, delta: number): void {
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

    // Locked-camera tank controls: Left/Right rotate, Up/Down move along facingAngle
    if (this.isFirstPerson && this.isLockedCamera && (vx !== 0 || vy !== 0)) {
      const turnSpeed = 2.5; // rad/s
      knight.facingAngle += vx * turnSpeed * (delta / 1000);
      const moveForward = -vy; // up key (vy=-1) → move forward
      vx = Math.cos(knight.facingAngle) * moveForward;
      vy = Math.sin(knight.facingAngle) * moveForward;
      knight.vx = vx * knight.speed;
      knight.vy = vy * knight.speed;
      knight.isMoving = moveForward !== 0;

      // Attack
      const fpsAttack = this.isFirstPerson && game.input.consumeAttackClick();
      const attackPressed = game.input.attack || knight.mobileAttackPressed || fpsAttack;
      knight.mobileAttackPressed = false;
      if (attackPressed && time > knight.attackCooldown) {
        knight.isAttacking = true;
        knight.attackHitProcessed = false;
        knight.attackCooldown = time + 600;
        this.attackEndTime = time + 300;
        if (this.isFirstPerson) {
          this.entityRenderer.swingFPSSword(game.tweens);
        } else {
          this.entityRenderer.swingSword(knight, game.tweens);
        }
        this.effectRenderer.showSlash(knight, game.tweens);
      }
      if (knight.isAttacking && this.attackEndTime > 0 && time >= this.attackEndTime) {
        knight.isAttacking = false;
        this.attackEndTime = 0;
      }
      return;
    }

    // Normalize diagonal
    if (vx !== 0 && vy !== 0) {
      const len = Math.sqrt(vx * vx + vy * vy);
      vx /= len;
      vy /= len;
    }

    // In free-look FPS mode, rotate movement vector by camera yaw for camera-relative movement
    if (this.isFirstPerson && !this.isLockedCamera && (vx !== 0 || vy !== 0)) {
      const yaw = this.cameraController.getYaw();
      // yaw: 0 = facing -Z, PI/2 = facing -X
      // Convert WASD (vx right, vy down) to world coords via yaw
      const sinY = Math.sin(yaw);
      const cosY = Math.cos(yaw);
      // Forward is -Z in Three.js, which is -vy direction in game coords
      // Right is +X in Three.js
      const worldX = vx * cosY + vy * sinY;
      const worldZ = -vx * sinY + vy * cosY;
      vx = worldX;
      vy = worldZ;
    }

    knight.vx = vx * knight.speed;
    knight.vy = vy * knight.speed;
    knight.isMoving = vx !== 0 || vy !== 0;

    if (this.isFirstPerson && !this.isLockedCamera) {
      // In free-look FPS, facing angle follows camera yaw
      const yaw = this.cameraController.getYaw();
      // Convert yaw to game facing angle: facingAngle = -yaw + PI/2
      knight.facingAngle = -yaw - Math.PI / 2;
    } else if (knight.isMoving) {
      knight.facingAngle = Math.atan2(vy, vx);
    }

    // Attack
    const fpsAttack = this.isFirstPerson && game.input.consumeAttackClick();
    const attackPressed = game.input.attack || knight.mobileAttackPressed || fpsAttack;
    knight.mobileAttackPressed = false;

    if (attackPressed && time > knight.attackCooldown) {
      knight.isAttacking = true;
      knight.attackHitProcessed = false;
      knight.attackCooldown = time + 600;
      this.attackEndTime = time + 300;

      if (this.isFirstPerson) {
        this.entityRenderer.swingFPSSword(game.tweens);
      } else {
        this.entityRenderer.swingSword(knight, game.tweens);
      }
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

  private handleStairTransition(game: Game, knight: KnightState, world: WorldState, time: number): void {
    if (time < this.stairCooldown) return;
    if (world.stairs.length === 0) return;

    const kx = entityTileX(knight);
    const ky = entityTileY(knight);

    if (world.tiles[ky]?.[kx] !== TileType.STAIRS) return;

    const stair = world.stairs.find(
      s => s.fromFloor === world.currentFloor && s.fromX === kx && s.fromY === ky
    );
    if (!stair) return;

    const prevFloor = world.currentFloor;

    this.visibilitySystem.switchFloor(
      stair.toFloor, world.floors[stair.toFloor].width, world.floors[stair.toFloor].height,
      world.floors[stair.toFloor].tiles, prevFloor
    );
    switchFloor(world, stair.toFloor);

    // Force visibility recompute on new floor
    this.lastVisTileX = -1;
    this.lastVisTileY = -1;

    knight.x = stair.toX + 0.5;
    knight.y = stair.toY + 0.5;
    knight.vx = 0;
    knight.vy = 0;

    this.detectionSystem.updateTiles(world.tiles);

    this.worldRenderer.dispose();
    this.worldRenderer = new WorldRenderer(game.scene);
    this.worldRenderer.build(world);

    this.entityRenderer.disposeTreasures();
    this.entityRenderer.buildTreasures(world.treasures);

    this.fogRenderer.dispose();
    this.fogRenderer.build(world.width, world.height);
    if (this.isFirstPerson) {
      this.fogRenderer.setVisible(false);
    }

    this.cameraController.configureForWorld(world.width, world.height);
    this.cameraController.snapToTarget(knight.x, knight.y);

    this.lighting.dispose();
    this.lighting = new LightingSetup(game.scene);
    const lavaTiles: { x: number; y: number }[] = [];
    for (let y = 0; y < world.height; y++) {
      for (let x = 0; x < world.width; x++) {
        if (world.tiles[y][x] === TileType.LAVA) {
          lavaTiles.push({ x, y });
        }
      }
    }
    this.lighting.addLavaLights(lavaTiles);

    const floorLabel = stair.toFloor === 0
      ? t('floating.groundFloor')
      : t('floating.floor', { level: stair.toFloor + 1 });
    this.floatingText.show(knight.x, 1.5, knight.y, floorLabel, '#88aaff');

    this.stairCooldown = time + 1000;
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

  private applyReward(reward: RewardItem, knight: KnightState): void {
    switch (reward.type) {
      case PowerUpType.HEAL:
        heal(knight, reward.value);
        break;
      case PowerUpType.ATTACK_BOOST:
        knight.activePowerUps.push({
          type: PowerUpType.ATTACK_BOOST,
          expiresAt: 0,
          multiplier: reward.value,
        });
        break;
      case PowerUpType.SPEED_BOOST:
        knight.activePowerUps.push({
          type: PowerUpType.SPEED_BOOST,
          expiresAt: 0,
          multiplier: reward.value,
        });
        break;
      case PowerUpType.SHADOW_CLOAK:
        knight.activePowerUps.push({
          type: PowerUpType.SHADOW_CLOAK,
          expiresAt: 0,
          multiplier: 1,
        });
        break;
      case PowerUpType.FIRE_RESIST:
        knight.activePowerUps.push({
          type: PowerUpType.FIRE_RESIST,
          expiresAt: 0,
          multiplier: reward.value,
        });
        break;
      case PowerUpType.HP_BOOST:
        knight.maxHP += reward.value;
        heal(knight, reward.value);
        this.rewardHPBonus = reward.value;
        break;
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
    save.maxHP = s.knight.maxHP - this.rewardHPBonus;
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

    // Don't toggle torch if wizard or wardrobe interaction took priority
    if (this.session.wizard && this.session.wizard.dialogStatus === WizardDialogStatus.AVAILABLE) return;
    if (knight.isHidingInWardrobe) return;

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

  // ── Wardrobe ────────────────────────────────────────────

  private findNearestWardrobe(
    knight: KnightState, world: WorldState
  ): { x: number; y: number } | null {
    // If already hiding, always report current wardrobe as "near"
    if (knight.isHidingInWardrobe && knight.hiddenWardrobeKey) {
      const [wx, wy] = knight.hiddenWardrobeKey.split(',').map(Number);
      return { x: wx, y: wy };
    }

    for (const f of world.furniture) {
      if (f.type !== FurnitureType.WARDROBE) continue;
      if (world.brokenFurniture?.has(`${f.x},${f.y}`)) continue;
      const dist = distance(knight.x, knight.y, f.x + 0.5, f.y + 0.5);
      if (dist <= WARDROBE_INTERACT_RANGE) return { x: f.x, y: f.y };
    }
    return null;
  }

  private handleWardrobeInteraction(
    game: Game, knight: KnightState, world: WorldState,
    near: { x: number; y: number } | null
  ): void {
    if (!game.input.interact) return;
    if (this.session.wizard?.dialogStatus === WizardDialogStatus.AVAILABLE) return;

    // Exit wardrobe
    if (knight.isHidingInWardrobe) {
      const [wx, wy] = (knight.hiddenWardrobeKey ?? '0,0').split(',').map(Number);
      this.worldRenderer.setWardrobeOpen(wx, wy, false);
      knight.x = knight.wardrobeEntryTileX + 0.5;
      knight.y = knight.wardrobeEntryTileY + 0.5;
      knight.isHidingInWardrobe = false;
      knight.hiddenWardrobeKey = null;
      this.floatingText.show(knight.x, 1.2, knight.y, t('floating.exitWardrobe'), '#aaccff');
      return;
    }

    // Enter wardrobe
    if (!near) return;
    knight.wardrobeEntryTileX = Math.floor(knight.x);
    knight.wardrobeEntryTileY = Math.floor(knight.y);
    knight.hiddenWardrobeKey = `${near.x},${near.y}`;
    knight.isHidingInWardrobe = true;
    knight.vx = 0;
    knight.vy = 0;
    this.worldRenderer.setWardrobeOpen(near.x, near.y, true);
    this.floatingText.show(near.x + 0.5, 1.2, near.y + 0.5, t('floating.hiding'), '#aaccff');
  }

  private handleWardrobeAttack(knight: KnightState, world: WorldState): void {
    const dx = Math.round(Math.cos(knight.facingAngle));
    const dy = Math.round(Math.sin(knight.facingAngle));
    const tx = entityTileX(knight) + dx;
    const ty = entityTileY(knight) + dy;
    const key = `${tx},${ty}`;

    if (!world.wardrobeHP?.has(key)) return;

    knight.attackHitProcessed = true;
    const hp = world.wardrobeHP.get(key)! - 1;
    world.wardrobeHP.set(key, hp);
    this.floatingText.show(tx + 0.5, 1.0, ty + 0.5, t('floating.crack'), '#aa8833');

    if (hp <= 0) {
      this.destroyWardrobe(tx, ty, world, knight);
    }
  }

  private destroyWardrobe(tx: number, ty: number, world: WorldState, knight: KnightState): void {
    const key = `${tx},${ty}`;
    world.wardrobeHP?.delete(key);
    world.brokenFurniture?.add(key);
    world.furnitureBlocked.delete(key);
    this.worldRenderer.removeWardrobe(tx, ty);
    this.floatingText.show(tx + 0.5, 1.3, ty + 0.5, t('floating.wardrobeDestroyed'), '#ff8833');

    // Eject player if they were hiding inside
    if (knight.isHidingInWardrobe && knight.hiddenWardrobeKey === key) {
      knight.isHidingInWardrobe = false;
      knight.hiddenWardrobeKey = null;
      knight.x = tx + 0.5;
      knight.y = ty + 0.5;
    }
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
