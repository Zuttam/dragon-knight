import * as THREE from 'three';
import { DragonStateData, DragonAIState, KnightState } from '../state/EntityState';
import { BurningTileState } from '../state/WorldState';
import { DetectionSystem } from '../systems/DetectionSystem';
import { VisibilitySystem } from '../systems/VisibilitySystem';
import { TweenManager } from '../core/TweenManager';

interface Particle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
}

function tileSidePositions(x: number, y: number) {
  return [
    { px: x + 0.5, pz: y,       ry: 0 },
    { px: x + 0.5, pz: y + 1,   ry: Math.PI },
    { px: x,       pz: y + 0.5, ry: Math.PI / 2 },
    { px: x + 1,   pz: y + 0.5, ry: -Math.PI / 2 },
  ];
}

export class EffectRenderer {
  private scene: THREE.Scene;

  // Shared geometries (pooled — never dispose per-particle)
  private fireParticleGeo: THREE.SphereGeometry;
  private burningParticleGeo: THREE.SphereGeometry;

  // Fire particles
  private fireParticles: Particle[] = [];
  private fireParticleMat: THREE.MeshBasicMaterial;

  // FOV cone (reuse material, rebuild geometry each frame)
  private fovConeMesh: THREE.Mesh | null = null;
  private fovConeMat: THREE.MeshBasicMaterial;

  // Slash arc
  private slashMeshes: THREE.Mesh[] = [];

  // Burning tile overlays
  private burningOverlays: Map<string, THREE.Mesh> = new Map();
  private burningFlames: Map<string, THREE.Mesh[]> = new Map();
  private burningLights: Map<string, THREE.PointLight> = new Map();
  private burningParticles: Map<string, Particle[]> = new Map();

  // Wood wall crack overlays
  private crackOverlays: Map<string, THREE.Mesh> = new Map();
  private crackSidePanels: Map<string, THREE.Mesh[]> = new Map();
  private crackDamageLevel: Map<string, number> = new Map();
  private crackParticles: Particle[] = [];
  private crackDustGeo: THREE.SphereGeometry;

  private static lightCrackTexture: THREE.CanvasTexture | null = null;
  private static heavyCrackTexture: THREE.CanvasTexture | null = null;

  // Fire breath light
  private fireLight: THREE.PointLight;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    this.fireParticleGeo = new THREE.SphereGeometry(0.15, 4, 4);
    this.burningParticleGeo = new THREE.SphereGeometry(0.05, 4, 4);
    this.crackDustGeo = new THREE.SphereGeometry(0.03, 4, 4);

    this.fireParticleMat = new THREE.MeshBasicMaterial({
      color: 0xff6600,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.fovConeMat = new THREE.MeshBasicMaterial({
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    this.fireLight = new THREE.PointLight(0xff4400, 0, 5);
    this.fireLight.position.y = 0.5;
    this.scene.add(this.fireLight);
  }

  // ── Fire Breath Particles ───────────────────────────────
  updateFireBreath(dragon: DragonStateData, delta: number): void {
    const isBreathing = dragon.fireBreathing && (dragon.aiState === DragonAIState.ATTACK || dragon.aiState === DragonAIState.SEARCH);

    if (isBreathing) {
      // Spawn particles
      for (let i = 0; i < 3; i++) {
        this.spawnFireParticle(dragon);
      }

      // Fire light at dragon mouth
      this.fireLight.position.set(
        dragon.x + Math.cos(dragon.facingAngle) * 1.05,
        0.81,
        dragon.y + Math.sin(dragon.facingAngle) * 1.05
      );
      this.fireLight.intensity = 1.5;
    } else {
      this.fireLight.intensity = 0;
    }

    // Update existing particles
    this.tickParticles(this.fireParticles, delta, 0.8, 0.4);
  }

  private spawnFireParticle(dragon: DragonStateData): void {
    const mat = this.fireParticleMat.clone();
    // Random orange/red color
    mat.color.setHSL(Math.random() * 0.1, 1, 0.5);

    const mesh = new THREE.Mesh(this.fireParticleGeo, mat);
    // Perpendicular direction for mouth-width lateral jitter
    const perpX = -Math.sin(dragon.facingAngle);
    const perpZ = Math.cos(dragon.facingAngle);
    const lateralJitter = (Math.random() - 0.5) * 0.08;
    mesh.position.set(
      dragon.x + Math.cos(dragon.facingAngle) * 1.05 + perpX * lateralJitter,
      0.81 + (Math.random() - 0.5) * 0.1,
      dragon.y + Math.sin(dragon.facingAngle) * 1.05 + perpZ * lateralJitter
    );

    const spread = (Math.random() - 0.5) * 0.35;
    const speed = 2 + Math.random() * 3;
    const velocity = new THREE.Vector3(
      Math.cos(dragon.facingAngle + spread) * speed,
      (Math.random() - 0.3) * 0.5,
      Math.sin(dragon.facingAngle + spread) * speed
    );

    const life = 300 + Math.random() * 200;
    this.scene.add(mesh);
    this.fireParticles.push({ mesh, velocity, life, maxLife: life });
  }

  // ── FOV Cone ────────────────────────────────────────────
  updateFOVCone(
    dragon: DragonStateData,
    detectionSystem: DetectionSystem,
    visibility: VisibilitySystem
  ): void {
    // Only show if dragon tile is visible to player
    const dtx = Math.floor(dragon.x);
    const dty = Math.floor(dragon.y);
    if (!visibility.isVisible(dtx, dty)) {
      if (this.fovConeMesh) this.fovConeMesh.visible = false;
      return;
    }

    // Don't show cone while dragon is sleeping
    if (dragon.aiState === DragonAIState.SLEEP) {
      if (this.fovConeMesh) this.fovConeMesh.visible = false;
      return;
    }

    const points = detectionSystem.getFOVConePoints(
      dragon.x, dragon.y,
      dragon.facingAngle,
      dragon.fovRange, dragon.fovAngle
    );

    if (points.length < 3) {
      if (this.fovConeMesh) this.fovConeMesh.visible = false;
      return;
    }

    // Update shared material
    this.fovConeMat.color.setHex(dragon.fireBreathing ? 0xff3300 : 0xffff00);
    this.fovConeMat.opacity = dragon.fireBreathing ? 0.30 : 0.18;

    // Build shape from points (in tile-space → Three.js XZ)
    const shape = new THREE.Shape();
    shape.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      shape.lineTo(points[i].x, points[i].y);
    }
    shape.closePath();

    const geo = new THREE.ShapeGeometry(shape);

    if (this.fovConeMesh) {
      this.fovConeMesh.geometry.dispose();
      this.fovConeMesh.geometry = geo;
      this.fovConeMesh.visible = true;
    } else {
      this.fovConeMesh = new THREE.Mesh(geo, this.fovConeMat);
      // ShapeGeometry is in XY plane, rotate to XZ (flat on ground)
      this.fovConeMesh.rotation.x = -Math.PI / 2;
      this.fovConeMesh.position.y = 0.05;
      this.scene.add(this.fovConeMesh);
    }
  }

  // ── Slash Arc ───────────────────────────────────────────
  showSlash(knight: KnightState, tweens: TweenManager): void {
    const offsetDist = 0.9;
    const slashX = knight.x + Math.cos(knight.facingAngle) * offsetDist;
    const slashZ = knight.y + Math.sin(knight.facingAngle) * offsetDist;

    // Create a partial ring arc
    const geo = new THREE.RingGeometry(0.2, 0.5, 12, 1, 0, Math.PI * 0.67);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xaaddff,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(slashX, 0.5, slashZ);
    mesh.rotation.x = -Math.PI / 2;
    mesh.rotation.z = -knight.facingAngle;
    this.scene.add(mesh);
    this.slashMeshes.push(mesh);

    tweens.add({
      from: 0,
      to: 1,
      duration: 300,
      ease: 'easeOut',
      onUpdate: (t) => {
        mesh.scale.setScalar(0.5 + t * 1.0);
        mat.opacity = 1.0 - t;
      },
      onComplete: () => {
        this.scene.remove(mesh);
        geo.dispose();
        mat.dispose();
        const idx = this.slashMeshes.indexOf(mesh);
        if (idx >= 0) this.slashMeshes.splice(idx, 1);
      },
    });
  }

  // ── Burning Tiles ───────────────────────────────────────
  updateBurningTiles(burningTiles: Map<string, BurningTileState>, currentTime: number, delta: number): void {
    // Add new overlays
    for (const [key, bt] of burningTiles) {
      if (!this.burningOverlays.has(key)) {
        // Top overlay (on top of wood wall)
        const geo = new THREE.PlaneGeometry(1, 1);
        const mat = new THREE.MeshBasicMaterial({
          color: 0xff4400,
          transparent: true,
          opacity: 0.6,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(bt.x + 0.5, 0.61, bt.y + 0.5);
        mesh.rotation.x = -Math.PI / 2;
        this.scene.add(mesh);
        this.burningOverlays.set(key, mesh);

        // Side flame planes (4 sides of the wood wall)
        const flames: THREE.Mesh[] = [];
        const flameGeo = new THREE.PlaneGeometry(1, 0.6);
        for (const side of tileSidePositions(bt.x, bt.y)) {
          const flameMat = new THREE.MeshBasicMaterial({
            color: 0xff6600,
            transparent: true,
            opacity: 0.5,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.DoubleSide,
          });
          const flameMesh = new THREE.Mesh(flameGeo, flameMat);
          flameMesh.position.set(side.px, 0.3, side.pz);
          flameMesh.rotation.y = side.ry;
          this.scene.add(flameMesh);
          flames.push(flameMesh);
        }
        this.burningFlames.set(key, flames);

        // Point light for fire glow
        const light = new THREE.PointLight(0xff6622, 1.0, 3);
        light.position.set(bt.x + 0.5, 0.8, bt.y + 0.5);
        this.scene.add(light);
        this.burningLights.set(key, light);

        this.burningParticles.set(key, []);
      }

      // Pulsate overlay
      const overlay = this.burningOverlays.get(key)!;
      const elapsed = currentTime - bt.startTime;
      (overlay.material as THREE.MeshBasicMaterial).opacity = 0.4 + 0.3 * Math.sin(elapsed * 0.005);

      // Animate side flames
      const flames = this.burningFlames.get(key);
      if (flames) {
        for (let i = 0; i < flames.length; i++) {
          const flameMat = flames[i].material as THREE.MeshBasicMaterial;
          flameMat.opacity = 0.3 + 0.3 * Math.sin(elapsed * 0.007 + i * 1.5);
          flameMat.color.setHSL(0.05 + Math.sin(elapsed * 0.004 + i) * 0.03, 1, 0.5);
        }
      }

      // Flicker burning light
      const light = this.burningLights.get(key);
      if (light) {
        light.intensity = 0.8 + Math.sin(elapsed * 0.01) * 0.3 + Math.sin(elapsed * 0.023) * 0.2;
      }

      // Spawn upward particles from top of wall
      const particles = this.burningParticles.get(key)!;
      if (Math.random() < 0.3) {
        const pmat = new THREE.MeshBasicMaterial({
          color: 0xff6600,
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        const pmesh = new THREE.Mesh(this.burningParticleGeo, pmat);
        pmesh.position.set(
          bt.x + 0.5 + (Math.random() - 0.5) * 0.6,
          0.6,
          bt.y + 0.5 + (Math.random() - 0.5) * 0.6
        );
        this.scene.add(pmesh);
        particles.push({
          mesh: pmesh,
          velocity: new THREE.Vector3(0, 1.5, 0),
          life: 400,
          maxLife: 400,
        });
      }

      // Update particles
      this.tickParticles(particles, delta, 0.8, 1, true);
    }

    // Remove overlays for tiles no longer burning
    for (const [key, mesh] of this.burningOverlays) {
      if (!burningTiles.has(key)) {
        this.scene.remove(mesh);
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
        this.burningOverlays.delete(key);

        const flames = this.burningFlames.get(key);
        if (flames) {
          for (const f of flames) {
            this.scene.remove(f);
            f.geometry.dispose();
            (f.material as THREE.Material).dispose();
          }
          this.burningFlames.delete(key);
        }

        const light = this.burningLights.get(key);
        if (light) {
          this.scene.remove(light);
          light.dispose();
          this.burningLights.delete(key);
        }

        const particles = this.burningParticles.get(key);
        if (particles) {
          for (const p of particles) {
            this.scene.remove(p.mesh);
            (p.mesh.material as THREE.Material).dispose();
          }
          this.burningParticles.delete(key);
        }
      }
    }
  }

  // ── Wood Wall Crack Overlays ──────────────────────────
  private static createCrackTexture(heavy: boolean): THREE.CanvasTexture {
    if (!heavy && EffectRenderer.lightCrackTexture) return EffectRenderer.lightCrackTexture;
    if (heavy && EffectRenderer.heavyCrackTexture) return EffectRenderer.heavyCrackTexture;

    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    ctx.clearRect(0, 0, size, size);

    const lineCount = heavy ? 4 : 2;
    const lineWidth = heavy ? 3 : 1.5;

    ctx.strokeStyle = 'rgba(30, 20, 10, 0.9)';
    ctx.lineWidth = lineWidth;

    for (let i = 0; i < lineCount; i++) {
      ctx.beginPath();
      let cx = 20 + Math.random() * (size - 40);
      let cy = 20 + Math.random() * (size - 40);
      ctx.moveTo(cx, cy);
      const segments = 4 + Math.floor(Math.random() * 4);
      for (let s = 0; s < segments; s++) {
        cx += (Math.random() - 0.5) * 30;
        cy += (Math.random() - 0.5) * 30;
        ctx.lineTo(cx, cy);
      }
      ctx.stroke();

      // Branches for heavy cracks
      if (heavy) {
        ctx.lineWidth = 1.5;
        for (let b = 0; b < 2; b++) {
          ctx.beginPath();
          const bx = cx + (Math.random() - 0.5) * 10;
          const by = cy + (Math.random() - 0.5) * 10;
          ctx.moveTo(bx, by);
          ctx.lineTo(bx + (Math.random() - 0.5) * 20, by + (Math.random() - 0.5) * 20);
          ctx.stroke();
        }
        ctx.lineWidth = lineWidth;
      }
    }

    // Debris dots for heavy cracks
    if (heavy) {
      ctx.fillStyle = 'rgba(40, 25, 10, 0.7)';
      for (let d = 0; d < 8; d++) {
        const dx = Math.random() * size;
        const dy = Math.random() * size;
        ctx.beginPath();
        ctx.arc(dx, dy, 1 + Math.random() * 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;

    if (heavy) EffectRenderer.heavyCrackTexture = texture;
    else EffectRenderer.lightCrackTexture = texture;

    return texture;
  }

  updateWoodWallDamage(x: number, y: number, hp: number): void {
    const key = `${x},${y}`;
    const currentLevel = this.crackDamageLevel.get(key) || 0;

    if (hp >= 3 || hp <= 0) {
      this.removeCrackOverlay(key);
      return;
    }

    const newLevel = hp === 2 ? 1 : 2;
    if (newLevel === currentLevel) return;

    // Remove old overlays before adding new ones
    this.removeCrackOverlay(key);

    const heavy = hp <= 1;
    const crackTex = EffectRenderer.createCrackTexture(heavy);

    // Top face crack overlay
    const topGeo = new THREE.PlaneGeometry(1, 1);
    const topMat = new THREE.MeshBasicMaterial({
      map: crackTex,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const topMesh = new THREE.Mesh(topGeo, topMat);
    topMesh.position.set(x + 0.5, 0.601, y + 0.5);
    topMesh.rotation.x = -Math.PI / 2;
    this.scene.add(topMesh);
    this.crackOverlays.set(key, topMesh);

    // Side crack panels (4 sides)
    const sideGeo = new THREE.PlaneGeometry(1, 0.6);
    const sideMeshes: THREE.Mesh[] = [];
    for (const side of tileSidePositions(x, y)) {
      const sideMat = new THREE.MeshBasicMaterial({
        map: crackTex,
        transparent: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(sideGeo, sideMat);
      mesh.position.set(side.px, 0.3, side.pz);
      mesh.rotation.y = side.ry;
      this.scene.add(mesh);
      sideMeshes.push(mesh);
    }
    this.crackSidePanels.set(key, sideMeshes);
    this.crackDamageLevel.set(key, newLevel);
  }

  private removeCrackOverlay(key: string): void {
    const top = this.crackOverlays.get(key);
    if (top) {
      this.scene.remove(top);
      top.geometry.dispose();
      (top.material as THREE.Material).dispose();
      this.crackOverlays.delete(key);
    }

    const sides = this.crackSidePanels.get(key);
    if (sides) {
      for (const s of sides) {
        this.scene.remove(s);
        s.geometry.dispose();
        (s.material as THREE.Material).dispose();
      }
      this.crackSidePanels.delete(key);
    }

    this.crackDamageLevel.delete(key);
  }

  updateCrackParticles(delta: number): void {
    // Spawn dust for heavily damaged walls (level 2 = HP 1)
    for (const [key, level] of this.crackDamageLevel) {
      if (level < 2) continue;
      if (Math.random() > 0.15) continue;

      const [xs, ys] = key.split(',');
      const x = parseInt(xs);
      const y = parseInt(ys);

      const mat = new THREE.MeshBasicMaterial({
        color: 0x8B6914,
        transparent: true,
        opacity: 0.6,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(this.crackDustGeo, mat);
      mesh.position.set(
        x + 0.5 + (Math.random() - 0.5) * 0.8,
        0.5 + Math.random() * 0.1,
        y + 0.5 + (Math.random() - 0.5) * 0.8
      );
      this.scene.add(mesh);
      this.crackParticles.push({
        mesh,
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.2,
          -0.5 - Math.random() * 0.3,
          (Math.random() - 0.5) * 0.2
        ),
        life: 600,
        maxLife: 600,
      });
    }

    // Update existing particles
    this.tickParticles(this.crackParticles, delta, 0.6);
  }

  private tickParticles(
    particles: Particle[], delta: number,
    opacityFactor: number, scaleFactor: number = 1, yOnly: boolean = false
  ): void {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= delta;
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        (p.mesh.material as THREE.Material).dispose();
        particles.splice(i, 1);
        continue;
      }
      const dt = delta * 0.001;
      if (yOnly) {
        p.mesh.position.y += p.velocity.y * dt;
      } else {
        p.mesh.position.x += p.velocity.x * dt;
        p.mesh.position.y += p.velocity.y * dt;
        p.mesh.position.z += p.velocity.z * dt;
      }
      const t = p.life / p.maxLife;
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = t * opacityFactor;
      p.mesh.scale.setScalar(t * scaleFactor);
    }
  }

  dispose(): void {
    // Clean fire particles
    for (const p of this.fireParticles) {
      this.scene.remove(p.mesh);
      (p.mesh.material as THREE.Material).dispose();
    }
    this.fireParticles = [];

    // Clean FOV cone
    if (this.fovConeMesh) {
      this.scene.remove(this.fovConeMesh);
      this.fovConeMesh.geometry.dispose();
      this.fovConeMesh = null;
    }

    // Clean slash meshes
    for (const m of this.slashMeshes) {
      this.scene.remove(m);
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
    }
    this.slashMeshes = [];

    // Clean burning overlays
    for (const [, mesh] of this.burningOverlays) {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
    this.burningOverlays.clear();

    for (const flames of this.burningFlames.values()) {
      for (const f of flames) {
        this.scene.remove(f);
        f.geometry.dispose();
        (f.material as THREE.Material).dispose();
      }
    }
    this.burningFlames.clear();

    for (const light of this.burningLights.values()) {
      this.scene.remove(light);
      light.dispose();
    }
    this.burningLights.clear();

    for (const particles of this.burningParticles.values()) {
      for (const p of particles) {
        this.scene.remove(p.mesh);
        (p.mesh.material as THREE.Material).dispose();
      }
    }
    this.burningParticles.clear();

    this.scene.remove(this.fireLight);

    // Clean crack overlays
    for (const key of [...this.crackOverlays.keys()]) {
      this.removeCrackOverlay(key);
    }
    for (const p of this.crackParticles) {
      this.scene.remove(p.mesh);
      (p.mesh.material as THREE.Material).dispose();
    }
    this.crackParticles = [];

    // Dispose shared resources
    this.fireParticleGeo.dispose();
    this.burningParticleGeo.dispose();
    this.crackDustGeo.dispose();
    this.fireParticleMat.dispose();
    this.fovConeMat.dispose();
  }
}
