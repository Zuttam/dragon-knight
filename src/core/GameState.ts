import type { Game } from './Game';

export interface GameState {
  enter(game: Game, data?: any): void;
  exit(game: Game): void;
  update(game: Game, delta: number): void;
}
