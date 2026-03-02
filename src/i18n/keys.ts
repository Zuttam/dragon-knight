// ── Login ──────────────────────────────────────────────
// login.title, login.subtitle, login.newKnight, login.importSave,
// login.namePlaceholder, login.age, login.enableMusic, login.musicVolume,
// login.enableWizard,
// login.anthropic, login.openai, login.apiKey, login.show, login.hide,
// login.beginQuest, login.continueQuest, login.back, login.deleteConfirm,
// login.level, login.justNow, login.minutesAgo, login.hoursAgo,
// login.daysAgo, login.monthsAgo
//
// ── HUD ────────────────────────────────────────────────
// hud.knight, hud.dragon, hud.levelTitle, hud.torchPrompt,
// hud.atkPowerUp, hud.spdPowerUp, hud.clkPowerUp, hud.firPowerUp
//
// ── Pause ──────────────────────────────────────────────
// pause.title, pause.resume, pause.music, pause.musicVolume,
// pause.exportSave, pause.exitDungeon
//
// ── Game Over ──────────────────────────────────────────
// gameOver.title, gameOver.subtitle, gameOver.retry, gameOver.mainMenu
//
// ── Level Complete ─────────────────────────────────────
// levelComplete.title, levelComplete.subtitle, levelComplete.message,
// levelComplete.continue, levelComplete.mainMenu
//
// ── Wizard ─────────────────────────────────────────────
// wizard.title, wizard.awaits, wizard.apiKeyDesc, wizard.anthropicClaude,
// wizard.openai, wizard.apiKeyPlaceholder, wizard.connect,
// wizard.changeApiKey, wizard.chatPlaceholder, wizard.send,
// wizard.ponders, wizard.gift, wizard.labelWizard, wizard.labelYou,
// wizard.speakPrompt, wizard.dangerNearby, wizard.mumbles,
// wizard.connectionLost, wizard.spellFailed
//
// ── Floating text ──────────────────────────────────────
// floating.healWizard, floating.wizardAtk, floating.wizardSpeed,
// floating.wizardCloak, floating.wizardFireShield, floating.wizardMaxHP,
// floating.wizardGift, floating.heal, floating.atkUp, floating.speedUp,
// floating.cloaked, floating.fireResist, floating.maxHpUp,
// floating.crack, floating.lit, floating.extinguished,
// floating.dangerApproaches
//
// ── Mobile ─────────────────────────────────────────────
// mobile.attack
//
// ── Level names ────────────────────────────────────────
// level.entranceHall, level.grandCorridor, level.burningKeep,
// level.castleDepths

export type TranslationKey =
  // Login
  | 'login.title'
  | 'login.subtitle'
  | 'login.newKnight'
  | 'login.importSave'
  | 'login.namePlaceholder'
  | 'login.age'
  | 'login.advancedSettings'
  | 'login.enableMusic'
  | 'login.musicVolume'
  | 'login.customTracks'
  | 'login.uploadTrack'
  | 'login.defaultTheme'
  | 'login.trackLimitReached'
  | 'login.fileTooLarge'
  | 'login.invalidFormat'
  | 'login.exportProfile'
  | 'login.enableWizard'
  | 'login.anthropic'
  | 'login.openai'
  | 'login.apiKey'
  | 'login.show'
  | 'login.hide'
  | 'login.beginQuest'
  | 'login.continueQuest'
  | 'login.back'
  | 'login.deleteConfirm'
  | 'login.level'
  | 'login.justNow'
  | 'login.minutesAgo'
  | 'login.hoursAgo'
  | 'login.daysAgo'
  | 'login.monthsAgo'
  // HUD
  | 'hud.knight'
  | 'hud.dragon'
  | 'hud.levelTitle'
  | 'hud.torchPrompt'
  | 'hud.atkPowerUp'
  | 'hud.spdPowerUp'
  | 'hud.clkPowerUp'
  | 'hud.firPowerUp'
  // Pause
  | 'pause.title'
  | 'pause.resume'
  | 'pause.music'
  | 'pause.musicVolume'
  | 'pause.track'
  | 'pause.defaultTheme'
  | 'pause.exportSave'
  | 'pause.exitDungeon'
  // Game Over
  | 'gameOver.title'
  | 'gameOver.subtitle'
  | 'gameOver.retry'
  | 'gameOver.mainMenu'
  // Level Complete
  | 'levelComplete.title'
  | 'levelComplete.subtitle'
  | 'levelComplete.message'
  | 'levelComplete.continue'
  | 'levelComplete.mainMenu'
  // Wizard
  | 'wizard.title'
  | 'wizard.awaits'
  | 'wizard.apiKeyDesc'
  | 'wizard.anthropicClaude'
  | 'wizard.openai'
  | 'wizard.apiKeyPlaceholder'
  | 'wizard.connect'
  | 'wizard.changeApiKey'
  | 'wizard.chatPlaceholder'
  | 'wizard.send'
  | 'wizard.ponders'
  | 'wizard.gift'
  | 'wizard.labelWizard'
  | 'wizard.labelYou'
  | 'wizard.speakPrompt'
  | 'wizard.dangerNearby'
  | 'wizard.mumbles'
  | 'wizard.connectionLost'
  | 'wizard.spellFailed'
  // Floating text
  | 'floating.healWizard'
  | 'floating.wizardAtk'
  | 'floating.wizardSpeed'
  | 'floating.wizardCloak'
  | 'floating.wizardFireShield'
  | 'floating.wizardMaxHP'
  | 'floating.wizardGift'
  | 'floating.heal'
  | 'floating.atkUp'
  | 'floating.speedUp'
  | 'floating.cloaked'
  | 'floating.fireResist'
  | 'floating.maxHpUp'
  | 'floating.crack'
  | 'floating.lit'
  | 'floating.extinguished'
  | 'floating.dangerApproaches'
  // Mobile
  | 'mobile.attack'
  // Level names
  | 'level.entranceHall'
  | 'level.grandCorridor'
  | 'level.burningKeep'
  | 'level.castleDepths';

export type TranslationMap = Record<TranslationKey, string>;
