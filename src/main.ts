import { Game } from './core/Game';
import { LoginState } from './states/LoginState';
import { PlayState } from './states/PlayState';
import { GameOverState } from './states/GameOverState';
import { LevelCompleteState } from './states/LevelCompleteState';
import { SaveSystem, UserSettings } from './save/SaveSystem';
import { setLocale } from './i18n';
import { musicStore } from './audio/MusicStore';

const container = document.getElementById('game-container')!;
const game = new Game(container);
const saveSystem = new SaveSystem();

// ── State transition helpers ──────────────────────────────
function goToLogin(): void {
  const loginState = new LoginState((settings, level, save) => {
    goToPlay(settings, level, save);
  });
  game.switchState(loginState);
}

function goToPlay(settings: UserSettings, level: number, save?: any): void {
  setLocale(settings.language);

  const playState = new PlayState(
    // onGameOver
    (s, lvl) => {
      goToGameOver(s, lvl);
    },
    // onLevelComplete
    (s, lvl, nextLvl) => {
      goToLevelComplete(s, lvl, nextLvl);
    },
    // onExitDungeon
    () => {
      goToLogin();
    }
  );

  game.switchState(playState, {
    settings,
    level,
    totalTreasures: save?.totalTreasures || 0,
    maxHP: save?.maxHP,
    baseAttack: save?.baseAttackPower,
  });
}

function goToGameOver(settings: UserSettings, level: number): void {
  const gameOverState = new GameOverState(
    (s, lvl) => goToPlay(s, lvl),
    () => goToLogin()
  );
  game.switchState(gameOverState, { settings, level });
}

function goToLevelComplete(settings: UserSettings, level: number, nextLevel: number): void {
  const save = saveSystem.loadProgress(settings.playerName);
  const levelCompleteState = new LevelCompleteState(
    (s, nextLvl) => goToPlay(s, nextLvl, save),
    () => goToLogin()
  );
  game.switchState(levelCompleteState, { settings, level, nextLevel });
}

// ── Migrate global wizard keys into per-profile settings ──
(() => {
  const globalProvider = localStorage.getItem('wizard:provider');
  const globalApiKey = localStorage.getItem('wizard:apiKey');
  if (!globalProvider && !globalApiKey) return;

  const profiles = saveSystem.listProfiles();
  for (const p of profiles) {
    const settings = saveSystem.loadSettings(p.playerName);
    if (settings && !settings.llmApiKey) {
      if (globalProvider) settings.llmProvider = globalProvider as any;
      if (globalApiKey) settings.llmApiKey = globalApiKey;
      saveSystem.saveSettings(settings);
    }
  }

  localStorage.removeItem('wizard:provider');
  localStorage.removeItem('wizard:apiKey');
})();

// ── Start ─────────────────────────────────────────────────
musicStore.open().then(() => goToLogin());
