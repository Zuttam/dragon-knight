export class GameOverOverlay {
  private container: HTMLElement | null = null;

  show(playerName: string, onRetry: () => void, onMenu: () => void): void {
    this.hide();
    this.container = document.createElement('div');
    this.container.id = 'gameover-overlay';
    this.container.innerHTML = `
      <div class="overlay-box">
        <h1 class="gameover-title">GAME OVER</h1>
        <p class="gameover-subtitle">The dragon's flames consumed ${playerName}...</p>
        <button id="retry-btn" class="overlay-btn primary-btn">Retry Level</button>
        <button id="menu-btn" class="overlay-btn secondary-btn">Main Menu</button>
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
