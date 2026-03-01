import { Game } from './core/Game';
import { LoginState } from './states/LoginState';
import { PlayState } from './states/PlayState';
import { GameOverState } from './states/GameOverState';
import { LevelCompleteState } from './states/LevelCompleteState';
import { SaveSystem } from './save/SaveSystem';

const container = document.getElementById('game-container')!;
const game = new Game(container);
const saveSystem = new SaveSystem();

// ── State transition helpers ──────────────────────────────
function goToLogin(): void {
  const loginState = new LoginState((playerName, level, save) => {
    goToPlay(playerName, level, save);
  });
  game.switchState(loginState);
}

function goToPlay(playerName: string, level: number, save?: any): void {
  const playState = new PlayState(
    // onGameOver
    (pName, lvl) => {
      goToGameOver(pName, lvl);
    },
    // onLevelComplete
    (pName, lvl, nextLvl) => {
      goToLevelComplete(pName, lvl, nextLvl);
    }
  );

  game.switchState(playState, {
    playerName,
    level,
    totalTreasures: save?.totalTreasures || 0,
    maxHP: save?.maxHP,
    baseAttack: save?.baseAttackPower,
  });
}

function goToGameOver(playerName: string, level: number): void {
  const gameOverState = new GameOverState(
    (pName, lvl) => goToPlay(pName, lvl),
    () => goToLogin()
  );
  game.switchState(gameOverState, { playerName, level });
}

function goToLevelComplete(playerName: string, level: number, nextLevel: number): void {
  const save = saveSystem.loadGame(playerName);
  const levelCompleteState = new LevelCompleteState(
    (pName, nextLvl) => goToPlay(pName, nextLvl, save),
    () => goToLogin()
  );
  game.switchState(levelCompleteState, { playerName, level, nextLevel });
}

// ── Start ─────────────────────────────────────────────────
goToLogin();
