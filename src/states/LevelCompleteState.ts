import type { GameState } from '../core/GameState';
import type { Game } from '../core/Game';
import type { UserSettings } from '../save/SaveSystem';
import type { RewardItem } from '../rewards/RewardItem';
import { LevelCompleteOverlay } from '../ui/LevelCompleteOverlay';

export class LevelCompleteState implements GameState {
  private overlay = new LevelCompleteOverlay();
  private onContinue: (settings: UserSettings, nextLevel: number, reward: RewardItem) => void;
  private onMenu: () => void;

  constructor(
    onContinue: (settings: UserSettings, nextLevel: number, reward: RewardItem) => void,
    onMenu: () => void
  ) {
    this.onContinue = onContinue;
    this.onMenu = onMenu;
  }

  enter(game: Game, data: { settings: UserSettings; level: number; nextLevel: number }): void {
    this.overlay.show(
      data.settings.playerName,
      data.level,
      data.nextLevel,
      (reward) => this.onContinue(data.settings, data.nextLevel, reward),
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
