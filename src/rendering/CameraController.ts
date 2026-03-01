import * as THREE from 'three';
import { lerp, clamp } from '../core/MathUtils';

export class CameraController {
  private camera: THREE.OrthographicCamera;
  private targetX: number = 0;
  private targetZ: number = 0;
  private smoothing: number = 0.08;

  // The camera offset from the target (isometric view)
  private offsetY: number = 14;
  private offsetZ: number = 10;

  private viewSize: number = 12;

  constructor(camera: THREE.OrthographicCamera) {
    this.camera = camera;
  }

  /**
   * Configure the camera to fit the world nicely on screen.
   * Shows a comfortable amount of the dungeon around the knight.
   */
  configureForWorld(worldWidth: number, worldHeight: number): void {
    const aspect = window.innerWidth / window.innerHeight;

    // For the isometric view, we see ~70% of vertical extent on screen
    // due to the camera angle. Choose viewSize to show a good chunk of the level.
    // Show roughly half the level height as the vertical view.
    const desiredViewH = Math.max(worldHeight * 0.55, 10);
    const desiredViewW = Math.max(worldWidth * 0.55, 10);

    // Pick the larger needed extent
    this.viewSize = Math.max(desiredViewH / 2, desiredViewW / (2 * aspect));
    this.viewSize = clamp(this.viewSize, 8, 25);

    this.camera.left = -this.viewSize * aspect;
    this.camera.right = this.viewSize * aspect;
    this.camera.top = this.viewSize;
    this.camera.bottom = -this.viewSize;
    this.camera.updateProjectionMatrix();
  }

  /**
   * Set the target to follow (tile-unit position).
   * tileX → Three.js x, tileY → Three.js z
   */
  setTarget(tileX: number, tileY: number): void {
    this.targetX = tileX;
    this.targetZ = tileY;
  }

  /**
   * Smoothly move camera toward target, clamped to world bounds.
   */
  update(worldWidth: number, worldHeight: number): void {
    const aspect = this.camera.right / this.camera.top;
    const viewH = this.camera.top;
    const viewW = viewH * aspect;

    // Clamp target so camera doesn't show outside the map
    const clampedX = clamp(this.targetX, viewW, Math.max(worldWidth - viewW, viewW));
    const clampedZ = clamp(this.targetZ, viewH, Math.max(worldHeight - viewH, viewH));

    // Smooth follow
    const cx = lerp(this.camera.position.x, clampedX, this.smoothing);
    const cz = lerp(this.camera.position.z - this.offsetZ, clampedZ, this.smoothing);

    this.camera.position.set(cx, this.offsetY, cz + this.offsetZ);
    this.camera.lookAt(cx, 0, cz);
  }

  /**
   * Instantly snap to target (no lerp).
   */
  snapToTarget(tileX: number, tileY: number): void {
    this.targetX = tileX;
    this.targetZ = tileY;
    this.camera.position.set(tileX, this.offsetY, tileY + this.offsetZ);
    this.camera.lookAt(tileX, 0, tileY);
  }
}
