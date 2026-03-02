import * as THREE from 'three';
import { ModelFactory } from './ModelFactory';
import { KnightState, DragonStateData, DragonAIState, WizardState, WizardDialogStatus, entityTileX, entityTileY } from '../state/EntityState';
import { TreasureState } from '../state/WorldState';
import { VisibilitySystem } from '../systems/VisibilitySystem';
import { DRAGON_VISIBILITY_FADE_START, DRAGON_VISIBILITY_FADE_END } from '../config/constants';
import { distance, angleBetween } from '../core/MathUtils';
import { TweenManager } from '../core/TweenManager';

export class EntityRenderer {
  private scene: THREE.Scene;

  // Knight
  private knightGroup: THREE.Group | null = null;
  private swordGroup: THREE.Group | null = null;
  private knightTorch: THREE.PointLight | null = null;
  private knightMaterials: THREE.MeshStandardMaterial[] = [];
  isSwordSwinging: boolean = false;

  // Dragon (cached refs to avoid per-frame traverse)
  private dragonGroup: THREE.Group | null = null;
  private dragonMaterials: THREE.MeshStandardMaterial[] = [];
  private dragonWings: THREE.Mesh[] = [];
  private dragonTailSegments: THREE.Object3D[] = [];
  private wingTime: number = 0;
  private tailTime: number = 0;

  // Wizard
  private wizardGroup: THREE.Group | null = null;
  private wizardMaterials: THREE.MeshStandardMaterial[] = [];
  private wizardOrb: THREE.Mesh | null = null;
  private wizardLight: THREE.PointLight | null = null;
  private wizardTime: number = 0;

  // Treasures
  private treasureModels: Map<number, THREE.Group> = new Map();
  private treasureTime: number = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  buildKnight(): void {
    this.knightGroup = ModelFactory.createKnight();
    this.scene.add(this.knightGroup);
    this.knightMaterials = this.collectMaterials(this.knightGroup);

    this.swordGroup = ModelFactory.createSword();
    this.swordGroup.position.y = 0.5;
    this.scene.add(this.swordGroup);

    // Torch light (warm orange, follows knight)
    this.knightTorch = new THREE.PointLight(0xffaa44, 1.0, 8);
    this.knightTorch.position.y = 1.2;
    this.knightTorch.castShadow = false;
    this.scene.add(this.knightTorch);
  }

  buildDragon(): void {
    this.dragonGroup = ModelFactory.createDragon();
    this.scene.add(this.dragonGroup);

    // Cache references once to avoid per-frame traverse()
    this.dragonMaterials = this.collectMaterials(this.dragonGroup);
    this.dragonWings = [];
    this.dragonTailSegments = [];

    this.dragonGroup.traverse((child) => {
      if (child instanceof THREE.Mesh && child.name.startsWith('wing_')) {
        this.dragonWings.push(child);
      }
      if (child.name.startsWith('tail_')) {
        this.dragonTailSegments.push(child);
      }
    });
  }

  buildTreasures(treasures: TreasureState[]): void {
    this.disposeTreasures();
    for (let i = 0; i < treasures.length; i++) {
      const t = treasures[i];
      const model = ModelFactory.createPowerUp(t.type);
      model.position.set(t.x + 0.5, 0, t.y + 0.5);
      this.scene.add(model);
      this.treasureModels.set(i, model);
    }
  }

  buildWizard(): void {
    this.wizardGroup = ModelFactory.createWizard();
    this.wizardGroup.visible = false;
    this.scene.add(this.wizardGroup);
    this.wizardMaterials = this.collectMaterials(this.wizardGroup);

    // Find orb mesh
    this.wizardGroup.traverse((child) => {
      if (child instanceof THREE.Mesh && child.name === 'wizard_orb') {
        this.wizardOrb = child;
      }
    });

    // Purple ambient light for wizard
    this.wizardLight = new THREE.PointLight(0x9944cc, 0.8, 6);
    this.wizardLight.position.y = 1.5;
    this.wizardLight.visible = false;
    this.scene.add(this.wizardLight);
  }

  updateWizard(wizard: WizardState, knight: KnightState, delta: number, visibility: VisibilitySystem): void {
    if (!this.wizardGroup) return;

    this.wizardTime += delta * 0.003;

    // Position
    this.wizardGroup.position.set(wizard.x, 0, wizard.y);
    if (this.wizardLight) {
      this.wizardLight.position.set(wizard.x, 1.5, wizard.y);
    }

    // Face the knight
    const angle = angleBetween(wizard.x, wizard.y, knight.x, knight.y);
    this.wizardGroup.rotation.y = -angle + Math.PI / 2;

    // Fog of war check — hide wizard if in HIDDEN state or not visible
    const wtx = entityTileX(wizard);
    const wty = entityTileY(wizard);
    const inFog = !visibility.visible[wty]?.[wtx];

    if (wizard.dialogStatus === WizardDialogStatus.HIDDEN || inFog) {
      this.wizardGroup.visible = false;
      if (this.wizardLight) this.wizardLight.visible = false;
      return;
    }

    this.wizardGroup.visible = true;

    // Status-based appearance
    switch (wizard.dialogStatus) {
      case WizardDialogStatus.REVEALED: {
        // Pulsing shimmer (0.1 - 0.3 opacity)
        const shimmer = 0.2 + Math.sin(this.wizardTime * 3) * 0.1;
        this.setMaterialsOpacity(this.wizardMaterials, shimmer);
        if (this.wizardLight) {
          this.wizardLight.visible = true;
          this.wizardLight.intensity = shimmer * 2;
        }
        break;
      }

      case WizardDialogStatus.AVAILABLE:
      case WizardDialogStatus.CHATTING: {
        this.setMaterialsOpacity(this.wizardMaterials, 1.0);
        if (this.wizardLight) {
          this.wizardLight.visible = true;
          this.wizardLight.intensity = 0.8;
        }
        break;
      }

      case WizardDialogStatus.DRAGON_NEARBY: {
        this.setMaterialsOpacity(this.wizardMaterials, 1.0);
        // Reddish warning tint
        for (const mat of this.wizardMaterials) {
          mat.emissive.setHex(0x882200);
          mat.emissiveIntensity = 0.2 + Math.sin(this.wizardTime * 6) * 0.15;
        }
        if (this.wizardLight) {
          this.wizardLight.visible = true;
          this.wizardLight.color.setHex(0xff4422);
          this.wizardLight.intensity = 0.5;
        }
        break;
      }

      case WizardDialogStatus.COMPLETED: {
        this.setMaterialsOpacity(this.wizardMaterials, 0.4);
        if (this.wizardLight) {
          this.wizardLight.visible = true;
          this.wizardLight.intensity = 0.2;
          this.wizardLight.color.setHex(0x9944cc);
        }
        break;
      }
    }

    // Reset emissive for non-dragon-nearby states
    if (wizard.dialogStatus !== WizardDialogStatus.DRAGON_NEARBY) {
      for (const mat of this.wizardMaterials) {
        mat.emissive.setHex(0x000000);
        mat.emissiveIntensity = 0;
      }
    }

    // Orb pulse animation
    if (this.wizardOrb && this.wizardOrb.material instanceof THREE.MeshStandardMaterial) {
      const pulse = 0.5 + Math.sin(this.wizardTime * 2) * 0.4;
      this.wizardOrb.material.emissiveIntensity = pulse;
      // Orb always glows purple
      this.wizardOrb.material.emissive.setHex(0x8844cc);
    }
  }

  updateKnight(knight: KnightState, delta: number): void {
    if (!this.knightGroup) return;

    // Position: game tileX → Three.js x, game tileY → Three.js z
    this.knightGroup.position.set(knight.x, 0, knight.y);

    // Rotation: facingAngle is in 2D (0 = right), map to Three.js Y rotation
    // In Three.js, rotation.y = 0 faces +Z, so we need: -angle + PI/2
    this.knightGroup.rotation.y = -knight.facingAngle + Math.PI / 2;

    // Cloak effect (transparency)
    const knightAlpha = knight.isCloaked ? 0.3 : 1.0;
    this.knightGroup.visible = knightAlpha > 0.01;
    this.setMaterialsOpacity(this.knightMaterials, knightAlpha);

    // Sword position
    if (this.swordGroup && !this.isSwordSwinging) {
      const handDist = 0.35;
      this.swordGroup.position.set(
        knight.x + Math.cos(knight.facingAngle) * handDist,
        0.5,
        knight.y + Math.sin(knight.facingAngle) * handDist
      );
      this.swordGroup.rotation.y = -knight.facingAngle + Math.PI / 2;
    }

    // Torch follows knight
    if (this.knightTorch) {
      this.knightTorch.position.set(knight.x, 1.2, knight.y);
    }

    // Simple walk bob animation
    if (knight.isMoving) {
      this.knightGroup.position.y = Math.sin(performance.now() * 0.01) * 0.03;
    }
  }

  swingSword(knight: KnightState, tweens: TweenManager): void {
    if (!this.swordGroup || this.isSwordSwinging) return;
    this.isSwordSwinging = true;

    const startAngle = knight.facingAngle - Math.PI / 3;
    const endAngle = knight.facingAngle + Math.PI / 3;
    const swingRadius = 0.45;

    tweens.add({
      from: 0,
      to: 1,
      duration: 250,
      ease: 'power2',
      onUpdate: (t) => {
        const currentAngle = startAngle + (endAngle - startAngle) * t;
        this.swordGroup!.position.set(
          knight.x + Math.cos(currentAngle) * swingRadius,
          0.5,
          knight.y + Math.sin(currentAngle) * swingRadius
        );
        this.swordGroup!.rotation.y = -currentAngle + Math.PI / 2;
      },
      onComplete: () => {
        this.isSwordSwinging = false;
      },
    });
  }

  updateDragon(
    dragon: DragonStateData,
    knight: KnightState,
    delta: number,
    visibility: VisibilitySystem
  ): void {
    if (!this.dragonGroup) return;

    this.dragonGroup.position.set(dragon.x, 0, dragon.y);
    this.dragonGroup.rotation.y = -dragon.facingAngle;

    // State-based tint (using cached materials)
    this.setDragonTint(dragon.aiState);

    // Wing flap animation (using cached wing refs)
    this.wingTime += delta * 0.005;
    const wingAngle = Math.sin(this.wingTime) * 0.3;
    for (const wing of this.dragonWings) {
      if (wing.position.z < 0) {
        wing.rotation.x = -0.3 + wingAngle;
      } else if (wing.position.z > 0.2) {
        wing.rotation.x = 0.3 - wingAngle;
      }
    }

    // Tail sine wave (using cached tail refs)
    this.tailTime += delta * 0.003;
    for (const seg of this.dragonTailSegments) {
      const idx = parseInt(seg.name.split('_')[1]);
      seg.position.z = Math.sin(this.tailTime + idx * 0.8) * 0.08;
    }

    // Distance-based fade & fog visibility
    const dtx = entityTileX(dragon);
    const dty = entityTileY(dragon);

    if (!visibility.visible[dty]?.[dtx]) {
      this.dragonGroup.visible = false;
      this.setMaterialsOpacity(this.dragonMaterials, 0);
      return;
    }

    const dist = distance(knight.x, knight.y, dragon.x, dragon.y);
    let alpha: number;
    if (dist <= DRAGON_VISIBILITY_FADE_START) {
      alpha = 1;
    } else if (dist >= DRAGON_VISIBILITY_FADE_END) {
      alpha = 0;
    } else {
      alpha = 1 - (dist - DRAGON_VISIBILITY_FADE_START) / (DRAGON_VISIBILITY_FADE_END - DRAGON_VISIBILITY_FADE_START);
    }

    this.dragonGroup.visible = alpha > 0.01;
    this.setMaterialsOpacity(this.dragonMaterials, alpha);
  }

  updateTreasures(treasures: TreasureState[], delta: number): void {
    this.treasureTime += delta * 0.002;

    for (let i = 0; i < treasures.length; i++) {
      const model = this.treasureModels.get(i);
      if (!model) continue;

      if (treasures[i].collected) {
        if (model.visible) {
          model.visible = false;
        }
        continue;
      }

      // Float and spin
      model.position.y = 0.1 + Math.sin(this.treasureTime + i) * 0.1;
      model.rotation.y = this.treasureTime * 1.5 + i * 1.2;
    }
  }

  private setDragonTint(state: DragonAIState): void {
    let color: number;
    let emissiveIntensity: number;
    switch (state) {
      case DragonAIState.ALERT:
        color = 0xffff00;
        emissiveIntensity = 0.3;
        break;
      case DragonAIState.ATTACK:
        color = 0xff0000;
        emissiveIntensity = 0.4;
        break;
      case DragonAIState.SEARCH:
        color = 0xff8800;
        emissiveIntensity = 0.3;
        break;
      default:
        color = 0x000000;
        emissiveIntensity = 0;
    }

    for (const mat of this.dragonMaterials) {
      mat.emissive.setHex(color);
      mat.emissiveIntensity = emissiveIntensity;
    }
  }

  private setMaterialsOpacity(materials: THREE.MeshStandardMaterial[], alpha: number): void {
    for (const mat of materials) {
      mat.transparent = true;
      mat.opacity = alpha;
    }
  }

  private collectMaterials(group: THREE.Group): THREE.MeshStandardMaterial[] {
    const mats: THREE.MeshStandardMaterial[] = [];
    group.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
        mats.push(child.material);
      }
    });
    return mats;
  }

  disposeTreasures(): void {
    for (const model of this.treasureModels.values()) {
      this.scene.remove(model);
    }
    this.treasureModels.clear();
  }

  dispose(): void {
    if (this.knightGroup) this.scene.remove(this.knightGroup);
    if (this.swordGroup) this.scene.remove(this.swordGroup);
    if (this.knightTorch) this.scene.remove(this.knightTorch);
    if (this.dragonGroup) this.scene.remove(this.dragonGroup);
    if (this.wizardGroup) this.scene.remove(this.wizardGroup);
    if (this.wizardLight) this.scene.remove(this.wizardLight);
    this.disposeTreasures();
    this.knightGroup = null;
    this.swordGroup = null;
    this.knightTorch = null;
    this.dragonGroup = null;
    this.wizardGroup = null;
    this.wizardOrb = null;
    this.wizardLight = null;
    this.knightMaterials = [];
    this.dragonMaterials = [];
    this.dragonWings = [];
    this.dragonTailSegments = [];
    this.wizardMaterials = [];
  }
}
