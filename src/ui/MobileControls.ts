export class MobileControls {
  private container: HTMLElement | null = null;
  private joystickBase: HTMLElement | null = null;
  private joystickThumb: HTMLElement | null = null;
  private attackBtn: HTMLElement | null = null;

  private joystickActive: boolean = false;
  private joystickCenterX: number = 0;
  private joystickCenterY: number = 0;
  private joystickRadius: number = 50;

  private onMove: (forceX: number, forceY: number) => void;
  private onAttack: () => void;

  constructor(
    onMove: (forceX: number, forceY: number) => void,
    onAttack: () => void
  ) {
    this.onMove = onMove;
    this.onAttack = onAttack;

    // Only show on touch devices
    if (!('ontouchstart' in window)) return;

    this.container = document.createElement('div');
    this.container.id = 'mobile-controls';
    this.container.innerHTML = `
      <div id="joystick-area">
        <div id="joystick-base">
          <div id="joystick-thumb"></div>
        </div>
      </div>
      <div id="attack-btn">ATTACK</div>
    `;
    document.body.appendChild(this.container);

    this.joystickBase = document.getElementById('joystick-base');
    this.joystickThumb = document.getElementById('joystick-thumb');
    this.attackBtn = document.getElementById('attack-btn');

    this.setupJoystick();
    this.setupAttack();
  }

  private setupJoystick(): void {
    const area = document.getElementById('joystick-area');
    if (!area || !this.joystickThumb) return;

    area.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.joystickActive = true;
      const touch = e.touches[0];
      const rect = area.getBoundingClientRect();
      this.joystickCenterX = rect.left + rect.width / 2;
      this.joystickCenterY = rect.top + rect.height / 2;
      this.updateJoystick(touch.clientX, touch.clientY);
    }, { passive: false });

    area.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (!this.joystickActive) return;
      const touch = e.touches[0];
      this.updateJoystick(touch.clientX, touch.clientY);
    }, { passive: false });

    area.addEventListener('touchend', () => {
      this.joystickActive = false;
      if (this.joystickThumb) {
        this.joystickThumb.style.transform = 'translate(-50%, -50%)';
      }
      this.onMove(0, 0);
    });
  }

  private updateJoystick(touchX: number, touchY: number): void {
    let dx = touchX - this.joystickCenterX;
    let dy = touchY - this.joystickCenterY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > this.joystickRadius) {
      dx = (dx / dist) * this.joystickRadius;
      dy = (dy / dist) * this.joystickRadius;
    }

    if (this.joystickThumb) {
      this.joystickThumb.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    }

    const forceX = dx / this.joystickRadius;
    const forceY = dy / this.joystickRadius;
    this.onMove(forceX, forceY);
  }

  private setupAttack(): void {
    if (!this.attackBtn) return;
    this.attackBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.onAttack();
      this.attackBtn!.classList.add('active');
    });
    this.attackBtn.addEventListener('touchend', () => {
      this.attackBtn!.classList.remove('active');
    });
  }

  dispose(): void {
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
  }
}
