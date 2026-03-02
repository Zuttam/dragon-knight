import { t } from '../i18n';

export class GameOverOverlay {
  private container: HTMLElement | null = null;

  show(playerName: string, onRetry: () => void, onMenu: () => void): void {
    this.hide();
    this.container = document.createElement('div');
    this.container.id = 'gameover-overlay';
    this.container.innerHTML = `
      <div class="overlay-box">
        <h1 class="gameover-title">${t('gameOver.title')}</h1>
        <p class="gameover-subtitle">${t('gameOver.subtitle', { name: playerName })}</p>
        <button id="retry-btn" class="overlay-btn primary-btn">${t('gameOver.retry')}</button>
        <button id="menu-btn" class="overlay-btn secondary-btn">${t('gameOver.mainMenu')}</button>
      </div>
    `;
    document.body.appendChild(this.container);

    document.getElementById('retry-btn')!.addEventListener('click', () => { this.hide(); onRetry(); });
    document.getElementById('menu-btn')!.addEventListener('click', () => { this.hide(); onMenu(); });
  }

  hide(): void {
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
  }
}
