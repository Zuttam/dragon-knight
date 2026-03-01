import * as THREE from 'three';

interface FloatingTextItem {
  element: HTMLDivElement;
  worldX: number;
  worldY: number; // Three.js Y (height)
  worldZ: number;
  elapsed: number;
  duration: number;
}

export class FloatingText {
  private camera: THREE.Camera;
  private renderer: THREE.WebGLRenderer;
  private items: FloatingTextItem[] = [];
  private container: HTMLDivElement;

  constructor(camera: THREE.Camera, renderer: THREE.WebGLRenderer) {
    this.camera = camera;
    this.renderer = renderer;

    this.container = document.createElement('div');
    this.container.id = 'floating-text-container';
    this.container.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:50;';
    document.body.appendChild(this.container);
  }

  /**
   * Show floating text at world position.
   * worldX/worldZ are tile-unit coords; worldY is Three.js height.
   */
  show(worldX: number, worldY: number, worldZ: number, text: string, color: string): void {
    const el = document.createElement('div');
    el.className = 'floating-text';
    el.textContent = text;
    el.style.color = color;
    this.container.appendChild(el);

    this.items.push({
      element: el,
      worldX,
      worldY,
      worldZ,
      elapsed: 0,
      duration: 1000,
    });
  }

  update(delta: number): void {
    const vec = new THREE.Vector3();

    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      item.elapsed += delta;

      if (item.elapsed >= item.duration) {
        item.element.remove();
        this.items.splice(i, 1);
        continue;
      }

      const t = item.elapsed / item.duration;

      // Float upward
      const yOffset = t * 1.5;

      // Project world position to screen
      vec.set(item.worldX, item.worldY + yOffset, item.worldZ);
      vec.project(this.camera);

      const canvas = this.renderer.domElement;
      const x = (vec.x * 0.5 + 0.5) * canvas.clientWidth;
      const y = (-vec.y * 0.5 + 0.5) * canvas.clientHeight;

      item.element.style.left = `${x}px`;
      item.element.style.top = `${y}px`;
      item.element.style.opacity = `${1 - t}`;
    }
  }

  dispose(): void {
    this.container.remove();
    this.items = [];
  }
}
