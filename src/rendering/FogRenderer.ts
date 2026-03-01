import * as THREE from 'three';
import { VisibilitySystem } from '../systems/VisibilitySystem';

export class FogRenderer {
  private scene: THREE.Scene;
  private fogMesh: THREE.Mesh | null = null;
  private fogTexture: THREE.DataTexture | null = null;
  private fogData: Uint8Array | null = null;
  private width: number = 0;
  private height: number = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  build(width: number, height: number): void {
    this.dispose();
    this.width = width;
    this.height = height;

    // Create fog data texture (1 pixel per tile, RGBA)
    this.fogData = new Uint8Array(width * height * 4);
    // Initialize to fully fogged (black, high alpha)
    for (let i = 0; i < width * height; i++) {
      this.fogData[i * 4 + 0] = 0;   // R
      this.fogData[i * 4 + 1] = 0;   // G
      this.fogData[i * 4 + 2] = 0;   // B
      this.fogData[i * 4 + 3] = 220; // A (high fog)
    }

    this.fogTexture = new THREE.DataTexture(this.fogData, width, height, THREE.RGBAFormat);
    this.fogTexture.magFilter = THREE.LinearFilter;
    this.fogTexture.minFilter = THREE.LinearFilter;
    this.fogTexture.needsUpdate = true;

    // Create a plane covering the entire map, just above ground
    const geo = new THREE.PlaneGeometry(width, height);
    const mat = new THREE.MeshBasicMaterial({
      map: this.fogTexture,
      transparent: true,
      depthWrite: false,
    });

    this.fogMesh = new THREE.Mesh(geo, mat);
    this.fogMesh.position.set(width / 2, 0.9, height / 2);
    this.fogMesh.rotation.x = -Math.PI / 2;
    this.fogMesh.renderOrder = 100;
    this.scene.add(this.fogMesh);
  }

  update(visibility: VisibilitySystem): void {
    if (!this.fogData || !this.fogTexture) return;

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        // DataTexture UV is bottom-up, so flip y
        const texY = this.height - 1 - y;
        const idx = (texY * this.width + x) * 4;

        if (visibility.visible[y][x]) {
          this.fogData[idx + 3] = 0;     // Fully visible
        } else if (visibility.explored[y][x]) {
          this.fogData[idx + 3] = 130;   // Explored but not visible
        } else {
          this.fogData[idx + 3] = 220;   // Unexplored
        }
      }
    }

    this.fogTexture.needsUpdate = true;
  }

  dispose(): void {
    if (this.fogMesh) {
      this.scene.remove(this.fogMesh);
      this.fogMesh.geometry.dispose();
      (this.fogMesh.material as THREE.Material).dispose();
      this.fogMesh = null;
    }
    if (this.fogTexture) {
      this.fogTexture.dispose();
      this.fogTexture = null;
    }
    this.fogData = null;
  }
}
