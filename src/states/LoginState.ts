import type { GameState } from '../core/GameState';
import type { Game } from '../core/Game';
import { SaveSystem } from '../save/SaveSystem';

export class LoginState implements GameState {
  private saveSystem = new SaveSystem();
  private onStart: (playerName: string, level: number, save: any) => void;
  private cleanupFn: (() => void) | null = null;

  constructor(onStart: (playerName: string, level: number, save: any) => void) {
    this.onStart = onStart;
  }

  enter(game: Game): void {
    const overlay = document.getElementById('login-overlay')!;
    const nameInput = document.getElementById('player-name') as HTMLInputElement;
    const startBtn = document.getElementById('start-btn')!;
    const continueBtn = document.getElementById('continue-btn')!;
    const importBtn = document.getElementById('import-btn')!;
    const importFile = document.getElementById('import-file') as HTMLInputElement;

    overlay.style.display = 'flex';

    // Reset
    nameInput.value = '';
    continueBtn.style.display = 'none';

    const onInput = () => {
      const name = nameInput.value.trim();
      if (name && this.saveSystem.hasSave(name)) {
        continueBtn.style.display = 'block';
        continueBtn.textContent = `Continue as ${name}`;
      } else {
        continueBtn.style.display = 'none';
      }
    };

    const onStart = () => {
      const name = nameInput.value.trim() || 'Knight';
      overlay.style.display = 'none';
      cleanup();
      this.onStart(name, 1, null);
    };

    const onContinue = () => {
      const name = nameInput.value.trim();
      const save = this.saveSystem.loadGame(name);
      overlay.style.display = 'none';
      cleanup();
      this.onStart(name, save?.currentLevel || 1, save);
    };

    const onImportClick = () => importFile.click();
    const onImportChange = () => {
      const file = importFile.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        const save = this.saveSystem.importFromMarkdown(content);
        if (save) {
          nameInput.value = save.playerName;
          this.saveSystem.saveGame(save);
          continueBtn.style.display = 'block';
          continueBtn.textContent = `Continue as ${save.playerName}`;
        }
      };
      reader.readAsText(file);
    };

    const onKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') onStart();
    };

    nameInput.addEventListener('input', onInput);
    startBtn.addEventListener('click', onStart);
    continueBtn.addEventListener('click', onContinue);
    importBtn.addEventListener('click', onImportClick);
    importFile.addEventListener('change', onImportChange);
    nameInput.addEventListener('keydown', onKeydown);

    const cleanup = () => {
      nameInput.removeEventListener('input', onInput);
      startBtn.removeEventListener('click', onStart);
      continueBtn.removeEventListener('click', onContinue);
      importBtn.removeEventListener('click', onImportClick);
      importFile.removeEventListener('change', onImportChange);
      nameInput.removeEventListener('keydown', onKeydown);
    };

    this.cleanupFn = cleanup;

    nameInput.focus();
  }

  exit(game: Game): void {
    const overlay = document.getElementById('login-overlay');
    if (overlay) overlay.style.display = 'none';
    if (this.cleanupFn) this.cleanupFn();
  }

  update(game: Game, delta: number): void {
    // No-op — login is purely event-driven
  }
}
