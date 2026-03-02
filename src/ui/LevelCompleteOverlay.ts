import { t } from '../i18n';

export class LevelCompleteOverlay {
  private container: HTMLElement | null = null;

  show(playerName: string, level: number, onContinue: () => void, onMenu: () => void): void {
    this.hide();
    this.container = document.createElement('div');
    this.container.id = 'levelcomplete-overlay';
    this.container.innerHTML = `
      <div class="overlay-box victory">
        <h1 class="victory-title">${t('levelComplete.title')}</h1>
        <p class="victory-subtitle">${t('levelComplete.subtitle', { level })}</p>
        <p class="victory-msg">${t('levelComplete.message', { name: playerName })}</p>
        <button id="continue-level-btn" class="overlay-btn primary-btn">${t('levelComplete.continue', { level: level + 1 })}</button>
        <button id="menu-btn2" class="overlay-btn secondary-btn">${t('levelComplete.mainMenu')}</button>
      </div>
    `;
    document.body.appendChild(this.container);

    document.getElementById('continue-level-btn')!.addEventListener('click', () => { this.hide(); onContinue(); });
    document.getElementById('menu-btn2')!.addEventListener('click', () => { this.hide(); onMenu(); });
  }

  hide(): void {
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
  }
}
