import { KnightState, DragonStateData, PowerUpType } from '../state/EntityState';

export class HUD {
  private container: HTMLElement | null = null;
  private onPause: (() => void) | null = null;
  private knightHPFill: HTMLElement | null = null;
  private dragonHPFill: HTMLElement | null = null;
  private powerupIcons: HTMLElement | null = null;

  show(level: number, levelName: string, onPause?: () => void): void {
    this.onPause = onPause || null;
    this.hide();

    this.container = document.createElement('div');
    this.container.id = 'hud';
    this.container.innerHTML = `
      <div class="hud-top-left">
        <div class="hud-label">Knight</div>
        <div class="hud-bar knight-bar"><div class="hud-bar-fill" id="knight-hp-fill"></div></div>
        <div class="hud-label" style="color:#ff6666">Dragon</div>
        <div class="hud-bar dragon-bar"><div class="hud-bar-fill" id="dragon-hp-fill"></div></div>
        <div id="powerup-icons" class="powerup-icons"></div>
      </div>
      <div class="hud-top-center">
        <div class="hud-level-text">Level ${level} - ${levelName}</div>
      </div>
      <div class="hud-top-right">
        <button id="pause-btn" class="hud-pause-btn">||</button>
      </div>
    `;
    document.body.appendChild(this.container);

    // Cache DOM references
    this.knightHPFill = document.getElementById('knight-hp-fill');
    this.dragonHPFill = document.getElementById('dragon-hp-fill');
    this.powerupIcons = document.getElementById('powerup-icons');

    // Wire pause button
    const pauseBtn = document.getElementById('pause-btn');
    if (pauseBtn && this.onPause) {
      pauseBtn.addEventListener('click', this.onPause);
    }
  }

  update(knight: KnightState, dragon: DragonStateData): void {
    if (this.knightHPFill) {
      const pct = Math.max(0, knight.hp / knight.maxHP) * 100;
      this.knightHPFill.style.width = `${pct}%`;
      this.knightHPFill.style.backgroundColor = pct < 30 ? '#ff4444' : pct < 60 ? '#ffaa44' : '#4488ff';
    }

    if (this.dragonHPFill) {
      const pct = Math.max(0, dragon.hp / dragon.maxHP) * 100;
      this.dragonHPFill.style.width = `${pct}%`;
      this.dragonHPFill.style.backgroundColor = '#ff4444';
    }

    if (this.powerupIcons) {
      const labels: Record<string, string> = {
        [PowerUpType.ATTACK_BOOST]: 'ATK',
        [PowerUpType.SPEED_BOOST]: 'SPD',
        [PowerUpType.SHADOW_CLOAK]: 'CLK',
        [PowerUpType.FIRE_RESIST]: 'FIR',
      };

      let html = '';
      for (const pu of knight.activePowerUps) {
        const label = labels[pu.type];
        if (label) {
          html += `<span class="powerup-icon">${label}</span>`;
        }
      }
      this.powerupIcons.innerHTML = html;
    }
  }

  hide(): void {
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
    this.knightHPFill = null;
    this.dragonHPFill = null;
    this.powerupIcons = null;
  }
}
