import type { GameState } from '../core/GameState';
import type { Game } from '../core/Game';
import { LevelCompleteOverlay } from '../ui/LevelCompleteOverlay';

export class LevelCompleteState implements GameState {
  private overlay = new LevelCompleteOverlay();
  private onContinue: (playerName: string, nextLevel: number) => void;
  private onMenu: () => void;

  constructor(
    onContinue: (playerName: string, nextLevel: number) => void,
    onMenu: () => void
  ) {
    this.onContinue = onContinue;
    this.onMenu = onMenu;
  }

  enter(game: Game, data: { playerName: string; level: number; nextLevel: number }): void {
    this.overlay.show(
      data.playerName,
      data.level,
      () => this.onContinue(data.playerName, data.nextLevel),
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
