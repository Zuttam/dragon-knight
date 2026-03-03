// ── Login ──────────────────────────────────────────────
// login.title, login.subtitle, login.newKnight, login.importSave,
// login.namePlaceholder, login.age, login.enableMusic, login.musicVolume, login.revealMap,
// login.apiKeyRequired,
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
// pause.cameraView, pause.firstPerson, pause.firstPersonLocked, pause.thirdPerson,
// pause.revealMap, pause.exportSave, pause.exitDungeon
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
// floating.floor, floating.groundFloor,
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
//
// ── Rewards ─────────────────────────────────────────────
// reward.chooseTitle, reward.heal.label, reward.heal.desc,
// reward.attack_boost.label, reward.attack_boost.desc,
// reward.speed_boost.label, reward.speed_boost.desc,
// reward.shadow_cloak.label, reward.shadow_cloak.desc,
// reward.fire_resist.label, reward.fire_resist.desc,
// reward.hp_boost.label, reward.hp_boost.desc

export type TranslationKey =
  // Login
  | 'login.title'
  | 'login.subtitle'
  | 'login.newKnight'
  | 'login.importSave'
  | 'login.namePlaceholder'
  | 'login.age'
  | 'login.enableMusic'
  | 'login.revealMap'
  | 'login.musicVolume'
  | 'login.customTracks'
  | 'login.uploadTrack'
  | 'login.defaultTheme'
  | 'login.trackLimitReached'
  | 'login.fileTooLarge'
  | 'login.invalidFormat'
  | 'login.exportProfile'
  | 'login.apiKeyRequired'
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
  | 'hud.wardrobePrompt'
  | 'hud.exitWardrobePrompt'
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
  | 'pause.cameraView'
  | 'pause.firstPerson'
  | 'pause.firstPersonLocked'
  | 'pause.thirdPerson'
  | 'pause.revealMap'
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
  | 'floating.floor'
  | 'floating.groundFloor'
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
  | 'floating.hiding'
  | 'floating.exitWardrobe'
  | 'floating.wardrobeDestroyed'
  // Mobile
  | 'mobile.attack'
  // Level names
  | 'level.entranceHall'
  | 'level.grandCorridor'
  | 'level.burningKeep'
  | 'level.castleDepths'
  // Rewards
  | 'reward.chooseTitle'
  | 'reward.heal.label'
  | 'reward.heal.desc'
  | 'reward.attack_boost.label'
  | 'reward.attack_boost.desc'
  | 'reward.speed_boost.label'
  | 'reward.speed_boost.desc'
  | 'reward.shadow_cloak.label'
  | 'reward.shadow_cloak.desc'
  | 'reward.fire_resist.label'
  | 'reward.fire_resist.desc'
  | 'reward.hp_boost.label'
  | 'reward.hp_boost.desc';

export type TranslationMap = Record<TranslationKey, string>;
