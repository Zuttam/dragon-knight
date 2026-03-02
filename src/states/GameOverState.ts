import type { GameState } from '../core/GameState';
import type { Game } from '../core/Game';
import type { UserSettings } from '../save/SaveSystem';
import { GameOverOverlay } from '../ui/GameOverOverlay';

export class GameOverState implements GameState {
  private overlay = new GameOverOverlay();
  private onRetry: (settings: UserSettings, level: number) => void;
  private onMenu: () => void;

  constructor(
    onRetry: (settings: UserSettings, level: number) => void,
    onMenu: () => void
  ) {
    this.onRetry = onRetry;
    this.onMenu = onMenu;
  }

  enter(game: Game, data: { settings: UserSettings; level: number }): void {
    this.overlay.show(
      data.settings.playerName,
      () => this.onRetry(data.settings, data.level),
      () => this.onMenu()
    );
  }

  exit(game: Game): void {
    this.overlay.hide();
  }

  update(game: Game, delta: number): void {
    // No-op
  }
}
