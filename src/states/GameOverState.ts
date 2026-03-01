import type { GameState } from '../core/GameState';
import type { Game } from '../core/Game';
import { GameOverOverlay } from '../ui/GameOverOverlay';

export class GameOverState implements GameState {
  private overlay = new GameOverOverlay();
  private onRetry: (playerName: string, level: number) => void;
  private onMenu: () => void;

  constructor(
    onRetry: (playerName: string, level: number) => void,
    onMenu: () => void
  ) {
    this.onRetry = onRetry;
    this.onMenu = onMenu;
  }

  enter(game: Game, data: { playerName: string; level: number }): void {
    this.overlay.show(
      data.playerName,
      () => this.onRetry(data.playerName, data.level),
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
