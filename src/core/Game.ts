import * as THREE from 'three';
import { InputManager } from './InputManager';
import { TweenManager } from './TweenManager';
import type { GameState } from './GameState';

export class Game {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.OrthographicCamera;
  input: InputManager;
  tweens: TweenManager;

  private currentState: GameState | null = null;
  private lastTime: number = 0;
  private running: boolean = true;

  // Screen size
  width: number;
  height: number;

  constructor(container: HTMLElement) {
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setClearColor(0x1a1a2e);
    container.appendChild(this.renderer.domElement);

    // Orthographic camera (isometric 3/4 top-down view)
    const aspect = this.width / this.height;
    const viewSize = 12;
    this.camera = new THREE.OrthographicCamera(
      -viewSize * aspect,
      viewSize * aspect,
      viewSize,
      -viewSize,
      0.1,
      100
    );
    // Set up ~60° top-down isometric view
    this.camera.position.set(0, 14, 10);
    this.camera.lookAt(0, 0, 0);

    // Scene
    this.scene = new THREE.Scene();

    // Input
    this.input = new InputManager();

    // Tweens
    this.tweens = new TweenManager();

    // Handle resize
    window.addEventListener('resize', () => this.onResize());

    // Start loop
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  switchState(state: GameState, data?: any): void {
    if (this.currentState) {
      this.currentState.exit(this);
    }
    // Clear scene for new state
    this.clearScene();
    this.currentState = state;
    this.currentState.enter(this, data);
  }

  private clearScene(): void {
    while (this.scene.children.length > 0) {
      const child = this.scene.children[0];
      this.scene.remove(child);
      if ((child as any).geometry) (child as any).geometry.dispose();
      if ((child as any).material) {
        const mat = (child as any).material;
        if (Array.isArray(mat)) {
          mat.forEach((m: THREE.Material) => m.dispose());
        } else {
          mat.dispose();
        }
      }
    }
    this.tweens.clear();
  }

  private loop = (now: number): void => {
    if (!this.running) return;
    requestAnimationFrame(this.loop);

    const delta = Math.min(now - this.lastTime, 100); // cap at 100ms
    this.lastTime = now;

    this.input.update();
    this.tweens.update(delta);

    if (this.currentState) {
      this.currentState.update(this, delta);
    }

    this.renderer.render(this.scene, this.camera);
  };

  private onResize(): void {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.renderer.setSize(this.width, this.height);

    const aspect = this.width / this.height;
    const viewSize = 12;
    this.camera.left = -viewSize * aspect;
    this.camera.right = viewSize * aspect;
    this.camera.top = viewSize;
    this.camera.bottom = -viewSize;
    this.camera.updateProjectionMatrix();
  }

  destroy(): void {
    this.running = false;
    this.renderer.dispose();
  }
}
