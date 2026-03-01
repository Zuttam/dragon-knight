export class PauseOverlay {
  private container: HTMLElement | null = null;
  private onResume: () => void;
  private onExportSave: () => void;

  constructor(onResume: () => void, onExportSave: () => void) {
    this.onResume = onResume;
    this.onExportSave = onExportSave;
  }

  show(): void {
    this.hide();
    this.container = document.createElement('div');
    this.container.id = 'pause-overlay';
    this.container.innerHTML = `
      <div class="pause-box">
        <h2>PAUSED</h2>
        <button id="resume-btn" class="overlay-btn primary-btn">Resume</button>
        <button id="export-save-btn" class="overlay-btn secondary-btn">Export Save</button>
      </div>
    `;
    document.body.appendChild(this.container);

    document.getElementById('resume-btn')!.addEventListener('click', () => this.onResume());
    document.getElementById('export-save-btn')!.addEventListener('click', () => this.onExportSave());
  }

  hide(): void {
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
  }
}
