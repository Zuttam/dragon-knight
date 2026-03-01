export class InputManager {
  private keys: Set<string> = new Set();
  private justPressedKeys: Set<string> = new Set();
  private previousKeys: Set<string> = new Set();

  // Pointer state
  pointerX: number = 0;
  pointerY: number = 0;
  pointerDown: boolean = false;

  constructor() {
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });
    window.addEventListener('pointerdown', (e) => {
      this.pointerDown = true;
      this.pointerX = e.clientX;
      this.pointerY = e.clientY;
    });
    window.addEventListener('pointerup', () => {
      this.pointerDown = false;
    });
    window.addEventListener('pointermove', (e) => {
      this.pointerX = e.clientX;
      this.pointerY = e.clientY;
    });
    // Prevent default on game keys
    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }
    });
  }

  isDown(code: string): boolean {
    return this.keys.has(code);
  }

  justPressed(code: string): boolean {
    return this.justPressedKeys.has(code);
  }

  update(): void {
    this.justPressedKeys.clear();
    for (const key of this.keys) {
      if (!this.previousKeys.has(key)) {
        this.justPressedKeys.add(key);
      }
    }
    this.previousKeys = new Set(this.keys);
  }

  get left(): boolean {
    return this.isDown('ArrowLeft') || this.isDown('KeyA');
  }
  get right(): boolean {
    return this.isDown('ArrowRight') || this.isDown('KeyD');
  }
  get up(): boolean {
    return this.isDown('ArrowUp') || this.isDown('KeyW');
  }
  get down(): boolean {
    return this.isDown('ArrowDown') || this.isDown('KeyS');
  }
  get attack(): boolean {
    return this.justPressed('Space');
  }
}
