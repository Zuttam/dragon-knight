import * as THREE from 'three';
import { lerp, clamp } from '../core/MathUtils';
import { TILT_FACTOR } from '../config/constants';

export class CameraController {
  private camera: THREE.OrthographicCamera;
  private targetX: number = 0;
  private targetZ: number = 0;
  private smoothing: number = 0.08;

  // The camera offset from the target (isometric view)
  private offsetY: number = 14;
  private offsetZ: number = 10;

  private viewSize: number = 12;
  private worldWidth: number = 0;
  private worldHeight: number = 0;

  private resizeHandler: (() => void) | null = null;

  constructor(camera: THREE.OrthographicCamera) {
    this.camera = camera;
  }

  /**
   * Configure the camera to show the entire world on screen.
   * Accounts for isometric camera tilt when computing the frustum.
   */
  configureForWorld(worldWidth: number, worldHeight: number): void {
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
    this.updateFrustum();

    // Re-compute frustum on window resize
    if (!this.resizeHandler) {
      this.resizeHandler = () => this.updateFrustum();
      window.addEventListener('resize', this.resizeHandler);
    }
  }

  private updateFrustum(): void {
    if (this.worldWidth === 0) return;
    const aspect = window.innerWidth / window.innerHeight;

    // viewSize to fit full width:  2 * viewSize * aspect >= worldWidth
    const viewSizeForWidth = this.worldWidth / (2 * aspect);
    // viewSize to fit full height: 2 * TILT_FACTOR * viewSize >= worldHeight
    const viewSizeForHeight = this.worldHeight / (2 * TILT_FACTOR);

    // Pick whichever is larger (levels are padded to fill the screen)
    this.viewSize = Math.max(viewSizeForWidth, viewSizeForHeight);

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
   * Uses tilt-corrected Z extent so the full map stays visible.
   */
  update(worldWidth: number, worldHeight: number): void {
    const viewW = this.camera.right; // half-width in world X
    // Actual Z half-extent on the ground, accounting for camera tilt
    const viewZExtent = this.camera.top * TILT_FACTOR;

    // Clamp target so camera doesn't show outside the map
    const clampedX = clamp(this.targetX, viewW, Math.max(worldWidth - viewW, viewW));
    const clampedZ = clamp(this.targetZ, viewZExtent, Math.max(worldHeight - viewZExtent, viewZExtent));

    // Smooth follow
    const cx = lerp(this.camera.position.x, clampedX, this.smoothing);
    const cz = lerp(this.camera.position.z - this.offsetZ, clampedZ, this.smoothing);

    this.camera.position.set(cx, this.offsetY, cz + this.offsetZ);
    this.camera.lookAt(cx, 0, cz);
  }

  /**
   * Instantly snap to target (no lerp), clamped to world bounds.
   */
  snapToTarget(tileX: number, tileY: number): void {
    this.targetX = tileX;
    this.targetZ = tileY;

    const viewW = this.camera.right;
    const viewZExtent = this.camera.top * TILT_FACTOR;

    const cx = clamp(tileX, viewW, Math.max(this.worldWidth - viewW, viewW));
    const cz = clamp(tileY, viewZExtent, Math.max(this.worldHeight - viewZExtent, viewZExtent));

    this.camera.position.set(cx, this.offsetY, cz + this.offsetZ);
    this.camera.lookAt(cx, 0, cz);
  }

  dispose(): void {
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
      this.resizeHandler = null;
    }
  }
}
