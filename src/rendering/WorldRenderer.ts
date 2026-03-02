import * as THREE from 'three';
import { TileType, TILE_PROPERTIES } from '../config/tileProperties';
import { WorldState, TorchState } from '../state/WorldState';
import { ModelFactory } from './ModelFactory';

interface TileGroup {
  mesh: THREE.InstancedMesh;
  indices: Map<string, number>; // "x,y" → instance index
}

export class WorldRenderer {
  private scene: THREE.Scene;
  private tileGroups: Map<TileType, TileGroup> = new Map();
  private grassBlades: THREE.InstancedMesh | null = null;
  private groundPlane: THREE.Mesh | null = null;
  private lavaPlanes: TileGroup | null = null;
  private lavaTime: number = 0;

  // Torches
  private torchModels: THREE.Group[] = [];
  private torchLights: THREE.PointLight[] = [];
  private torchFlames: THREE.Mesh[] = [];
  private torchTime: number = 0;

  private static woodTexture: THREE.CanvasTexture | null = null;

  private static createWoodTexture(): THREE.CanvasTexture {
    if (WorldRenderer.woodTexture) return WorldRenderer.woodTexture;

    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Base brown color
    ctx.fillStyle = '#8B6914';
    ctx.fillRect(0, 0, size, size);

    // Draw horizontal grain lines
    for (let y = 0; y < size; y++) {
      const variation = Math.sin(y * 0.3) * 10 + Math.sin(y * 0.7) * 5;
      const brightness = 100 + variation + (Math.random() - 0.5) * 15;
      const r = Math.floor(brightness * 1.1);
      const g = Math.floor(brightness * 0.7);
      const b = Math.floor(brightness * 0.2);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(0, y, size, 1);
    }

    // Add darker knot-like patches
    for (let i = 0; i < 3; i++) {
      const kx = Math.random() * size;
      const ky = Math.random() * size;
      const kr = 5 + Math.random() * 8;
      const grad = ctx.createRadialGradient(kx, ky, 0, kx, ky, kr);
      grad.addColorStop(0, 'rgba(60, 35, 10, 0.6)');
      grad.addColorStop(1, 'rgba(60, 35, 10, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(kx - kr, ky - kr, kr * 2, kr * 2);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    WorldRenderer.woodTexture = texture;
    return texture;
  }

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  build(world: WorldState): void {
    this.dispose();

    // Count tiles per type
    const counts: Map<TileType, number> = new Map();
    for (let y = 0; y < world.height; y++) {
      for (let x = 0; x < world.width; x++) {
        const t = world.tiles[y][x];
        const visual = this.visualTileType(t);
        counts.set(visual, (counts.get(visual) || 0) + 1);
      }
    }

    // Create instanced meshes per tile type
    const dummy = new THREE.Object3D();

    for (const [tileType, count] of counts) {
      if (count === 0) continue;

      const { geometry, material, yOffset } = this.getTileMeshInfo(tileType);
      const instanced = new THREE.InstancedMesh(geometry, material, count);
      instanced.receiveShadow = true;
      if (tileType === TileType.WALL || tileType === TileType.WOOD_WALL) {
        instanced.castShadow = true;
      }

      const indices = new Map<string, number>();
      let idx = 0;

      for (let y = 0; y < world.height; y++) {
        for (let x = 0; x < world.width; x++) {
          if (this.visualTileType(world.tiles[y][x]) !== tileType) continue;

          // Convert: game tileX → Three.js x, game tileY → Three.js z
          dummy.position.set(x + 0.5, yOffset, y + 0.5);
          // Flat planes need rotation to lie on XZ
          dummy.rotation.set(this.isFlat(tileType) ? -Math.PI / 2 : 0, 0, 0);
          dummy.updateMatrix();
          instanced.setMatrixAt(idx, dummy.matrix);
          indices.set(`${x},${y}`, idx);
          idx++;
        }
      }

      instanced.instanceMatrix.needsUpdate = true;

      // Initialize instance colors for wood walls (white = no tint)
      if (tileType === TileType.WOOD_WALL) {
        const white = new THREE.Color(1, 1, 1);
        for (let i = 0; i < idx; i++) {
          instanced.setColorAt(i, white);
        }
        instanced.instanceColor!.needsUpdate = true;
      }

      this.scene.add(instanced);

      if (tileType === TileType.LAVA) {
        this.lavaPlanes = { mesh: instanced, indices };
      }

      this.tileGroups.set(tileType, { mesh: instanced, indices });
    }

    // Add grass blade decorations
    this.buildGrassBlades(world);

    // Large ground plane beneath everything to prevent visible background on wide screens.
    // Uses MeshBasicMaterial with a very dark color that blends with the shadowed
    // wall tiles at level edges. The renderer clear color is set to match in PlayState.
    const groundGeo = new THREE.PlaneGeometry(500, 500);
    const groundMat = new THREE.MeshBasicMaterial({ color: 0x111118 });
    this.groundPlane = new THREE.Mesh(groundGeo, groundMat);
    this.groundPlane.rotation.x = -Math.PI / 2;
    this.groundPlane.position.set(world.width / 2, -0.02, world.height / 2);
    this.scene.add(this.groundPlane);

    // Build torches
    this.buildTorches(world);
  }

  private visualTileType(t: TileType): TileType {
    // Spawn/waypoint/treasure tiles render as floor
    if (t === TileType.KNIGHT_SPAWN || t === TileType.DRAGON_SPAWN ||
        t === TileType.TREASURE || t === TileType.DRAGON_WAYPOINT) {
      return TileType.FLOOR;
    }
    return t;
  }

  private isFlat(tileType: TileType): boolean {
    return tileType !== TileType.WALL && tileType !== TileType.WOOD_WALL
      && tileType !== TileType.ELEVATED_WALL && tileType !== TileType.STAIRS;
  }

  private getTileMeshInfo(tileType: TileType): { geometry: THREE.BufferGeometry; material: THREE.Material; yOffset: number } {
    switch (tileType) {
      case TileType.WALL:
        return {
          geometry: new THREE.BoxGeometry(1, 0.8, 1),
          material: new THREE.MeshStandardMaterial({ color: 0x555566 }),
          yOffset: 0.4,
        };
      case TileType.WOOD_WALL:
        return {
          geometry: new THREE.BoxGeometry(1, 0.6, 1),
          material: new THREE.MeshStandardMaterial({
            color: 0xccaa66,
            map: WorldRenderer.createWoodTexture(),
            roughness: 0.8,
          }),
          yOffset: 0.3,
        };
      case TileType.SHADOW:
        return {
          geometry: new THREE.PlaneGeometry(1, 1),
          material: new THREE.MeshStandardMaterial({ color: 0x1a1a2e }),
          yOffset: 0.001,
        };
      case TileType.GRASS:
        return {
          geometry: new THREE.PlaneGeometry(1, 1),
          material: new THREE.MeshStandardMaterial({ color: 0x336633 }),
          yOffset: 0.001,
        };
      case TileType.LAVA:
        return {
          geometry: new THREE.PlaneGeometry(1, 1),
          material: new THREE.MeshStandardMaterial({
            color: 0xff3300,
            emissive: 0xff3300,
            emissiveIntensity: 0.5,
          }),
          yOffset: 0.001,
        };
      case TileType.DOOR:
        return {
          geometry: new THREE.PlaneGeometry(1, 1),
          material: new THREE.MeshStandardMaterial({ color: 0x886633 }),
          yOffset: 0.002,
        };
      case TileType.STAIRS:
        return {
          geometry: new THREE.BoxGeometry(1, 0.4, 1),
          material: new THREE.MeshStandardMaterial({ color: 0x666677 }),
          yOffset: 0.2,
        };
      case TileType.ELEVATED_FLOOR:
        return {
          geometry: new THREE.PlaneGeometry(1, 1),
          material: new THREE.MeshStandardMaterial({ color: 0x444455 }),
          yOffset: 0.4,
        };
      case TileType.ELEVATED_WALL:
        return {
          geometry: new THREE.BoxGeometry(1, 1.2, 1),
          material: new THREE.MeshStandardMaterial({ color: 0x666677 }),
          yOffset: 0.6 + 0.4, // sits on top of the elevated floor
        };
      default: // FLOOR and others
        return {
          geometry: new THREE.PlaneGeometry(1, 1),
          material: new THREE.MeshStandardMaterial({ color: 0x333344 }),
          yOffset: 0.0,
        };
    }
  }

  private buildGrassBlades(world: WorldState): void {
    let bladeCount = 0;
    const grassTiles: { x: number; y: number }[] = [];
    for (let y = 0; y < world.height; y++) {
      for (let x = 0; x < world.width; x++) {
        if (world.tiles[y][x] === TileType.GRASS) {
          grassTiles.push({ x, y });
          bladeCount += 5;
        }
      }
    }

    if (bladeCount === 0) return;

    const geo = new THREE.ConeGeometry(0.03, 0.15, 3);
    const mat = new THREE.MeshStandardMaterial({ color: 0x448844 });
    this.grassBlades = new THREE.InstancedMesh(geo, mat, bladeCount);

    const dummy = new THREE.Object3D();
    let idx = 0;
    for (const tile of grassTiles) {
      for (let i = 0; i < 5; i++) {
        const ox = (Math.random() - 0.5) * 0.8;
        const oz = (Math.random() - 0.5) * 0.8;
        dummy.position.set(tile.x + 0.5 + ox, 0.075, tile.y + 0.5 + oz);
        dummy.rotation.y = Math.random() * Math.PI;
        dummy.updateMatrix();
        this.grassBlades.setMatrixAt(idx, dummy.matrix);
        idx++;
      }
    }
    this.grassBlades.instanceMatrix.needsUpdate = true;
    this.scene.add(this.grassBlades);
  }

  private buildTorches(world: WorldState): void {
    for (let i = 0; i < world.torches.length; i++) {
      const torch = world.torches[i];
      const model = ModelFactory.createTorch();

      // Determine which adjacent tile is floor to orient the torch
      const dirs = [
        { dx: 0, dy: -1, angle: 0 },       // floor is north → torch faces north
        { dx: 1, dy: 0, angle: -Math.PI / 2 }, // floor is east
        { dx: 0, dy: 1, angle: Math.PI },    // floor is south
        { dx: -1, dy: 0, angle: Math.PI / 2 }, // floor is west
      ];

      let facing = 0;
      for (const dir of dirs) {
        const nx = torch.x + dir.dx;
        const ny = torch.y + dir.dy;
        if (nx >= 0 && nx < world.width && ny >= 0 && ny < world.height) {
          if (TILE_PROPERTIES[world.tiles[ny][nx]].walkable) {
            facing = dir.angle;
            break;
          }
        }
      }

      model.position.set(torch.x + 0.5, 0, torch.y + 0.5);
      model.rotation.y = facing;
      this.scene.add(model);
      this.torchModels.push(model);

      // Find flame mesh
      let foundFlame: THREE.Mesh | null = null;
      model.traverse((child) => {
        if (child instanceof THREE.Mesh && child.name === 'torch_flame') {
          foundFlame = child;
        }
      });
      this.torchFlames.push(foundFlame!);

      // Add point light — warm glow with realistic falloff
      const light = new THREE.PointLight(0xff8833, torch.lit ? 3.0 : 0, 7, 1.5);
      light.position.set(torch.x + 0.5, 0.9, torch.y + 0.5);
      this.scene.add(light);
      this.torchLights.push(light);

      // Set initial visibility
      if (foundFlame) {
        (foundFlame as THREE.Mesh).visible = torch.lit;
      }
    }
  }

  updateTorchStates(torches: TorchState[]): void {
    for (let i = 0; i < torches.length; i++) {
      const torch = torches[i];
      const flame = this.torchFlames[i];
      const light = this.torchLights[i];
      if (flame) flame.visible = torch.lit;
      if (light) light.intensity = torch.lit ? 3.0 : 0;
    }
  }

  /**
   * Update lava glow animation and torch flicker.
   */
  update(delta: number): void {
    this.lavaTime += delta * 0.001;
    if (this.lavaPlanes) {
      const mat = this.lavaPlanes.mesh.material as THREE.MeshStandardMaterial;
      const t = (Math.sin(this.lavaTime * 2) + 1) * 0.5;
      mat.emissiveIntensity = 0.3 + t * 0.4;
    }

    // Torch flame flicker
    this.torchTime += delta * 0.001;
    for (let i = 0; i < this.torchLights.length; i++) {
      const light = this.torchLights[i];
      if (light.intensity > 0) {
        light.intensity = 2.5 + Math.sin(this.torchTime * 8 + i * 2.3) * 0.5
          + Math.sin(this.torchTime * 13 + i * 1.7) * 0.3;
        // Subtle flame scale oscillation
        const flame = this.torchFlames[i];
        if (flame) {
          const s = 1.0 + Math.sin(this.torchTime * 10 + i * 3.1) * 0.15;
          flame.scale.set(s, s, s);
        }
      }
    }
  }

  /**
   * Remove a wall at given tile position (e.g., when wood wall is destroyed).
   */
  removeWallInstance(tileType: TileType, x: number, y: number): void {
    const group = this.tileGroups.get(tileType);
    if (!group) return;

    const key = `${x},${y}`;
    const idx = group.indices.get(key);
    if (idx === undefined) return;

    // Hide by scaling to zero
    const dummy = new THREE.Object3D();
    dummy.position.set(0, -100, 0);
    dummy.scale.set(0, 0, 0);
    dummy.updateMatrix();
    group.mesh.setMatrixAt(idx, dummy.matrix);
    group.mesh.instanceMatrix.needsUpdate = true;
    group.indices.delete(key);
  }

  /**
   * Add a floor instance where a wall was destroyed.
   * (Simplified: add a small plane at that position)
   */
  addFloorAt(x: number, y: number): void {
    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshStandardMaterial({ color: 0x333344 })
    );
    plane.position.set(x + 0.5, 0.001, y + 0.5);
    plane.rotation.x = -Math.PI / 2;
    plane.receiveShadow = true;
    this.scene.add(plane);
  }

  /**
   * Tint a wood wall instance based on remaining HP.
   */
  tintWoodWallInstance(x: number, y: number, hp: number): void {
    const group = this.tileGroups.get(TileType.WOOD_WALL);
    if (!group) return;
    const idx = group.indices.get(`${x},${y}`);
    if (idx === undefined) return;

    let r = 1.0, g = 1.0, b = 1.0;
    if (hp === 2) {
      r = 0.78; g = 0.72; b = 0.60;
    } else if (hp <= 1) {
      r = 0.55; g = 0.48; b = 0.38;
    }
    group.mesh.setColorAt(idx, new THREE.Color(r, g, b));
    group.mesh.instanceColor!.needsUpdate = true;
  }

  /**
   * Slightly shrink a wood wall instance to convey structural weakness.
   */
  shrinkWoodWallInstance(x: number, y: number, scale: number): void {
    const group = this.tileGroups.get(TileType.WOOD_WALL);
    if (!group) return;
    const idx = group.indices.get(`${x},${y}`);
    if (idx === undefined) return;

    const dummy = new THREE.Object3D();
    dummy.position.set(x + 0.5, 0.3, y + 0.5); // yOffset for WOOD_WALL
    dummy.scale.set(scale, scale, scale);
    dummy.updateMatrix();
    group.mesh.setMatrixAt(idx, dummy.matrix);
    group.mesh.instanceMatrix.needsUpdate = true;
  }

  dispose(): void {
    for (const group of this.tileGroups.values()) {
      this.scene.remove(group.mesh);
      group.mesh.geometry.dispose();
      (group.mesh.material as THREE.Material).dispose();
      group.mesh.dispose();
    }
    this.tileGroups.clear();

    if (this.grassBlades) {
      this.scene.remove(this.grassBlades);
      this.grassBlades.geometry.dispose();
      (this.grassBlades.material as THREE.Material).dispose();
      this.grassBlades.dispose();
      this.grassBlades = null;
    }

    if (this.groundPlane) {
      this.scene.remove(this.groundPlane);
      this.groundPlane.geometry.dispose();
      (this.groundPlane.material as THREE.Material).dispose();
      this.groundPlane = null;
    }

    this.lavaPlanes = null;

    // Clean up torches
    for (const model of this.torchModels) {
      this.scene.remove(model);
    }
    this.torchModels = [];
    for (const light of this.torchLights) {
      this.scene.remove(light);
      light.dispose();
    }
    this.torchLights = [];
    this.torchFlames = [];
  }
}
