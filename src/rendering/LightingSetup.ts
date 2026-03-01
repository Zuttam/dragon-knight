import * as THREE from 'three';

export class LightingSetup {
  ambient: THREE.AmbientLight;
  directional: THREE.DirectionalLight;
  private scene: THREE.Scene;
  private lavaLights: THREE.PointLight[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    // Ambient — dim blue dungeon ambiance
    this.ambient = new THREE.AmbientLight(0x404060, 0.4);
    scene.add(this.ambient);

    // Directional — above-left, casting shadows
    this.directional = new THREE.DirectionalLight(0xffeedd, 0.6);
    this.directional.position.set(-5, 15, -5);
    this.directional.castShadow = true;
    this.directional.shadow.mapSize.width = 1024;
    this.directional.shadow.mapSize.height = 1024;
    this.directional.shadow.camera.near = 0.5;
    this.directional.shadow.camera.far = 50;
    this.directional.shadow.camera.left = -25;
    this.directional.shadow.camera.right = 25;
    this.directional.shadow.camera.top = 25;
    this.directional.shadow.camera.bottom = -25;
    scene.add(this.directional);
    scene.add(this.directional.target);
  }

  /**
   * Position the directional light relative to the camera target.
   */
  updateDirectionalTarget(centerX: number, centerZ: number): void {
    this.directional.position.set(centerX - 5, 15, centerZ - 5);
    this.directional.target.position.set(centerX, 0, centerZ);
  }

  /**
   * Add subtle lava glow point lights for lava tile clusters.
   */
  addLavaLights(lavaTiles: { x: number; y: number }[]): void {
    // Group lava tiles and add one light per cluster (every ~4 tiles)
    for (let i = 0; i < lavaTiles.length; i += 4) {
      const t = lavaTiles[i];
      const light = new THREE.PointLight(0xff4400, 0.5, 4);
      light.position.set(t.x + 0.5, 0.3, t.y + 0.5);
      this.scene.add(light);
      this.lavaLights.push(light);
    }
  }

  dispose(): void {
    this.scene.remove(this.ambient);
    this.scene.remove(this.directional);
    this.scene.remove(this.directional.target);
    for (const light of this.lavaLights) {
      this.scene.remove(light);
    }
    this.lavaLights = [];
  }
}
