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
  private burningParticles: Map<string, Particle[]> = new Map();

  // Fire breath light
  private fireLight: THREE.PointLight;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    this.fireParticleGeo = new THREE.SphereGeometry(0.1, 4, 4);
    this.burningParticleGeo = new THREE.SphereGeometry(0.05, 4, 4);

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
        dragon.x + Math.cos(dragon.facingAngle) * 0.5,
        0.5,
        dragon.y + Math.sin(dragon.facingAngle) * 0.5
      );
      this.fireLight.intensity = 1.5;
    } else {
      this.fireLight.intensity = 0;
    }

    // Update existing particles
    for (let i = this.fireParticles.length - 1; i >= 0; i--) {
      const p = this.fireParticles[i];
      p.life -= delta;
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        (p.mesh.material as THREE.Material).dispose();
        this.fireParticles.splice(i, 1);
        continue;
      }

      const dt = delta * 0.001;
      p.mesh.position.x += p.velocity.x * dt;
      p.mesh.position.y += p.velocity.y * dt;
      p.mesh.position.z += p.velocity.z * dt;
      const t = p.life / p.maxLife;
      p.mesh.scale.setScalar(t * 0.15);
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = t * 0.8;
    }
  }

  private spawnFireParticle(dragon: DragonStateData): void {
    const mat = this.fireParticleMat.clone();
    // Random orange/red color
    mat.color.setHSL(Math.random() * 0.1, 1, 0.5);

    const mesh = new THREE.Mesh(this.fireParticleGeo, mat);
    mesh.position.set(
      dragon.x + Math.cos(dragon.facingAngle) * 0.4,
      0.4 + Math.random() * 0.2,
      dragon.y + Math.sin(dragon.facingAngle) * 0.4
    );

    const spread = (Math.random() - 0.5) * 0.5;
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
    if (!visibility.visible[dty]?.[dtx]) {
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
    this.fovConeMat.opacity = dragon.fireBreathing ? 0.25 : 0.12;

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
        const geo = new THREE.PlaneGeometry(1, 1);
        const mat = new THREE.MeshBasicMaterial({
          color: 0xff4400,
          transparent: true,
          opacity: 0.6,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(bt.x + 0.5, 0.02, bt.y + 0.5);
        mesh.rotation.x = -Math.PI / 2;
        this.scene.add(mesh);
        this.burningOverlays.set(key, mesh);
        this.burningParticles.set(key, []);
      }

      // Pulsate overlay
      const overlay = this.burningOverlays.get(key)!;
      const elapsed = currentTime - bt.startTime;
      (overlay.material as THREE.MeshBasicMaterial).opacity = 0.4 + 0.3 * Math.sin(elapsed * 0.005);

      // Spawn upward particles (shared geometry)
      const particles = this.burningParticles.get(key)!;
      if (Math.random() < 0.3) {
        const mat = new THREE.MeshBasicMaterial({
          color: 0xff6600,
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        const mesh = new THREE.Mesh(this.burningParticleGeo, mat);
        mesh.position.set(
          bt.x + 0.5 + (Math.random() - 0.5) * 0.6,
          0.1,
          bt.y + 0.5 + (Math.random() - 0.5) * 0.6
        );
        this.scene.add(mesh);
        particles.push({
          mesh,
          velocity: new THREE.Vector3(0, 1.5, 0),
          life: 400,
          maxLife: 400,
        });
      }

      // Update particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= delta;
        if (p.life <= 0) {
          this.scene.remove(p.mesh);
          (p.mesh.material as THREE.Material).dispose();
          particles.splice(i, 1);
          continue;
        }
        p.mesh.position.y += p.velocity.y * delta * 0.001;
        const t = p.life / p.maxLife;
        (p.mesh.material as THREE.MeshBasicMaterial).opacity = t * 0.8;
        p.mesh.scale.setScalar(t);
      }
    }

    // Remove overlays for tiles no longer burning
    for (const [key, mesh] of this.burningOverlays) {
      if (!burningTiles.has(key)) {
        this.scene.remove(mesh);
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
        this.burningOverlays.delete(key);

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

    for (const particles of this.burningParticles.values()) {
      for (const p of particles) {
        this.scene.remove(p.mesh);
        (p.mesh.material as THREE.Material).dispose();
      }
    }
    this.burningParticles.clear();

    this.scene.remove(this.fireLight);

    // Dispose shared resources
    this.fireParticleGeo.dispose();
    this.burningParticleGeo.dispose();
    this.fireParticleMat.dispose();
    this.fovConeMat.dispose();
  }
}
