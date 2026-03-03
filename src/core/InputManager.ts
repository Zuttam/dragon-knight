export class InputManager {
  private keys: Set<string> = new Set();
  private justPressedKeys: Set<string> = new Set();
  private previousKeys: Set<string> = new Set();

  // Pointer state
  pointerX: number = 0;
  pointerY: number = 0;
  pointerDown: boolean = false;

  // Mouse delta (for pointer lock / FPS look)
  private mouseDX: number = 0;
  private mouseDY: number = 0;
  private _pointerLocked: boolean = false;
  private _attackClicked: boolean = false;

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
      if (this._pointerLocked && e.button === 0) {
        this._attackClicked = true;
      }
    });
    window.addEventListener('pointerup', () => {
      this.pointerDown = false;
    });
    window.addEventListener('pointermove', (e) => {
      this.pointerX = e.clientX;
      this.pointerY = e.clientY;
    });
    // Accumulate mouse movement when pointer locked
    window.addEventListener('mousemove', (e) => {
      if (this._pointerLocked) {
        this.mouseDX += e.movementX;
        this.mouseDY += e.movementY;
      }
    });
    // Track pointer lock state
    document.addEventListener('pointerlockchange', () => {
      const wasLocked = this._pointerLocked;
      this._pointerLocked = document.pointerLockElement !== null;
      // Flush accumulated deltas when pointer lock is acquired to avoid
      // initial movement spike from cursor-to-center snap
      if (this._pointerLocked && !wasLocked) {
        this.mouseDX = 0;
        this.mouseDY = 0;
      }
    });
    // Prevent default on game keys
    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyE'].includes(e.code)) {
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
  get interact(): boolean {
    return this.justPressed('KeyE');
  }

  get attackClick(): boolean {
    return this._attackClicked;
  }

  get isPointerLocked(): boolean {
    return this._pointerLocked;
  }

  requestPointerLock(element: HTMLElement): void {
    element.requestPointerLock();
  }

  exitPointerLock(): void {
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
  }

  consumeMouseDelta(): { dx: number; dy: number } {
    const delta = { dx: this.mouseDX, dy: this.mouseDY };
    this.mouseDX = 0;
    this.mouseDY = 0;
    return delta;
  }

  consumeAttackClick(): boolean {
    const clicked = this._attackClicked;
    this._attackClicked = false;
    return clicked;
  }
}
