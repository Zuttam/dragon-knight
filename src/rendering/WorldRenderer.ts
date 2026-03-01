import * as THREE from 'three';
import { TileType, TILE_PROPERTIES } from '../config/tileProperties';
import { WorldState } from '../state/WorldState';

interface TileGroup {
  mesh: THREE.InstancedMesh;
  indices: Map<string, number>; // "x,y" → instance index
}

export class WorldRenderer {
  private scene: THREE.Scene;
  private tileGroups: Map<TileType, TileGroup> = new Map();
  private grassBlades: THREE.InstancedMesh | null = null;
  private lavaPlanes: TileGroup | null = null;
  private lavaTime: number = 0;

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
      this.scene.add(instanced);

      if (tileType === TileType.LAVA) {
        this.lavaPlanes = { mesh: instanced, indices };
      }

      this.tileGroups.set(tileType, { mesh: instanced, indices });
    }

    // Add grass blade decorations
    this.buildGrassBlades(world);
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
          material: new THREE.MeshStandardMaterial({ color: 0x997744 }),
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

  /**
   * Update lava glow animation.
   */
  update(delta: number): void {
    this.lavaTime += delta * 0.001;
    if (this.lavaPlanes) {
      const mat = this.lavaPlanes.mesh.material as THREE.MeshStandardMaterial;
      const t = (Math.sin(this.lavaTime * 2) + 1) * 0.5;
      mat.emissiveIntensity = 0.3 + t * 0.4;
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

    this.lavaPlanes = null;
  }
}
