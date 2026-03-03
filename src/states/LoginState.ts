import type { GameState } from '../core/GameState';
import type { Game } from '../core/Game';
import { SaveSystem, UserSettings, SupportedLanguage, LLMProvider, computeAgeRange } from '../save/SaveSystem';
import { t, setLocale, localizeDOM } from '../i18n';
import { MODELS_BY_PROVIDER } from '../config/constants';
import { musicManager, type PlaylistEntry } from '../audio/MusicManager';
import { musicStore, type CustomTrackMeta } from '../audio/MusicStore';

export class LoginState implements GameState {
  private saveSystem = new SaveSystem();
  private onStart: (settings: UserSettings, level: number, save: any) => void;
  private cleanupFn: (() => void) | null = null;

  constructor(onStart: (settings: UserSettings, level: number, save: any) => void) {
    this.onStart = onStart;
  }

  enter(game: Game): void {
    const overlay = document.getElementById('login-overlay')!;
    overlay.style.display = 'flex';

    const profiles = this.saveSystem.listProfiles();

    // Profile list is shared across profiles — always show in default language
    setLocale('en');
    localizeDOM();

    if (profiles.length === 0) {
      this.showSettingsForm(null);
    } else {
      this.showProfileList();
    }
  }

  private showProfileList(): void {
    const profileListView = document.getElementById('profile-list-view')!;
    const settingsFormView = document.getElementById('settings-form-view')!;
    profileListView.style.display = 'block';
    settingsFormView.style.display = 'none';
    setLocale('en');
    localizeDOM();

    const profileList = document.getElementById('profile-list')!;
    const newKnightBtn = document.getElementById('new-knight-btn')!;
    const importBtn = document.getElementById('import-btn')!;
    const importFile = document.getElementById('import-file') as HTMLInputElement;

    // Render profile cards
    const profiles = this.saveSystem.listProfiles();
    profileList.innerHTML = '';
    for (const p of profiles) {
      const card = document.createElement('div');
      card.className = 'profile-card';

      const info = document.createElement('div');
      info.className = 'profile-info';

      const name = document.createElement('div');
      name.className = 'profile-name';
      name.textContent = p.playerName;

      const details = document.createElement('div');
      details.className = 'profile-details';
      const ago = this.timeAgo(p.lastPlayed);
      details.textContent = `${t('login.level', { level: p.currentLevel })} \u2022 ${ago}`;

      info.appendChild(name);
      info.appendChild(details);

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'profile-delete-btn';
      deleteBtn.textContent = '\u00D7';
      deleteBtn.title = t('login.deleteConfirm', { name: p.playerName });

      card.appendChild(info);
      card.appendChild(deleteBtn);
      profileList.appendChild(card);

      // Click card -> edit profile
      info.addEventListener('click', () => {
        this.cleanup();
        this.showSettingsForm(p.playerName);
      });

      // Delete button
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm(t('login.deleteConfirm', { name: p.playerName }))) {
          this.saveSystem.deleteProfile(p.playerName).then(() => {
            this.cleanup();
            const remaining = this.saveSystem.listProfiles();
            if (remaining.length === 0) {
              this.showSettingsForm(null);
            } else {
              this.showProfileList();
            }
          });
        }
      });
    }

    const onNewKnight = () => {
      this.cleanup();
      this.showSettingsForm(null);
    };

    const onImportClick = () => importFile.click();
    const onImportChange = async () => {
      const file = importFile.files?.[0];
      if (!file) return;
      const save = await this.saveSystem.importFromFile(file);
      if (save) {
        this.saveSystem.saveProgress(save);
        this.cleanup();
        this.showSettingsForm(save.playerName);
      }
      importFile.value = '';
    };

    newKnightBtn.addEventListener('click', onNewKnight);
    importBtn.addEventListener('click', onImportClick);
    importFile.addEventListener('change', onImportChange);

    this.cleanupFn = () => {
      newKnightBtn.removeEventListener('click', onNewKnight);
      importBtn.removeEventListener('click', onImportClick);
      importFile.removeEventListener('change', onImportChange);
    };
  }

  private showSettingsForm(profileName: string | null): void {
    const profileListView = document.getElementById('profile-list-view')!;
    const settingsFormView = document.getElementById('settings-form-view')!;
    profileListView.style.display = 'none';
    settingsFormView.style.display = 'block';

    const nameInput = document.getElementById('player-name') as HTMLInputElement;
    const languageSelect = document.getElementById('player-language') as HTMLSelectElement;
    const ageInput = document.getElementById('player-age') as HTMLInputElement;
    const startBtn = document.getElementById('start-btn')!;
    const continueBtn = document.getElementById('continue-btn')!;
    const backBtn = document.getElementById('back-btn')!;
    const wizardApiSettings = document.getElementById('wizard-api-settings')!;
    const wizardApiKeyInput = document.getElementById('wizard-api-key') as HTMLInputElement;
    const apiKeyToggle = document.getElementById('api-key-toggle')!;
    const providerRadios = document.querySelectorAll<HTMLInputElement>('input[name="wizard-provider"]');
    const modelSelect = document.getElementById('wizard-model') as HTMLSelectElement;
    const musicEnabledCb = document.getElementById('music-enabled') as HTMLInputElement;
    const musicVolumeSlider = document.getElementById('music-volume') as HTMLInputElement;
    const musicVolumeRow = document.getElementById('music-volume-row')!;
    const tracksSection = document.getElementById('music-tracks-section')!;
    const trackList = document.getElementById('music-track-list')!;
    const uploadTrackBtn = document.getElementById('upload-track-btn')!;
    const trackFileInput = document.getElementById('track-file-input') as HTMLInputElement;
    const cameraSettings = document.getElementById('camera-settings')!;
    const cameraModeSelect = document.getElementById('camera-mode-select') as HTMLSelectElement;
    const revealMapCb = document.getElementById('reveal-map-enabled') as HTMLInputElement;

    const populateModels = (provider: string, selectedModel?: string) => {
      const models = MODELS_BY_PROVIDER[provider] || [];
      modelSelect.innerHTML = models.map(m => `<option value="${m.id}">${m.label}</option>`).join('');
      if (selectedModel) modelSelect.value = selectedModel;
    };

    const hasProfiles = this.saveSystem.listProfiles().length > 0;
    const isEditing = profileName !== null;

    // Track state for this form session
    let currentActiveTrack = -1;
    let currentCustomTracks: CustomTrackMeta[] = [];

    const formatSize = (bytes: number): string => {
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
      return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
    };

    const renderTrackList = () => {
      trackList.innerHTML = '';

      // Default theme item
      const defaultItem = document.createElement('div');
      defaultItem.className = `music-track-item${currentActiveTrack === -1 ? ' active' : ''}`;
      defaultItem.innerHTML = `<span class="track-name">${t('login.defaultTheme')}</span>`;
      defaultItem.addEventListener('click', () => {
        currentActiveTrack = -1;
        musicManager.setTrack(-1, null);
        renderTrackList();
      });
      trackList.appendChild(defaultItem);

      // Custom tracks
      for (const track of currentCustomTracks) {
        const item = document.createElement('div');
        item.className = `music-track-item${currentActiveTrack === track.slotIndex ? ' active' : ''}`;

        const nameSpan = document.createElement('span');
        nameSpan.className = 'track-name';
        nameSpan.textContent = track.fileName;

        const sizeSpan = document.createElement('span');
        sizeSpan.className = 'track-size';
        sizeSpan.textContent = formatSize(track.size);

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'track-delete-btn';
        deleteBtn.textContent = '\u00D7';

        item.appendChild(nameSpan);
        item.appendChild(sizeSpan);
        item.appendChild(deleteBtn);
        trackList.appendChild(item);

        // Click track name to activate
        nameSpan.addEventListener('click', async () => {
          const currentName = nameInput.value.trim() || 'Knight';
          const blob = await musicStore.getTrackBlob(currentName, track.slotIndex);
          if (blob) {
            currentActiveTrack = track.slotIndex;
            const url = URL.createObjectURL(blob);
            musicManager.setTrack(track.slotIndex, url);
            renderTrackList();
          }
        });

        // Delete track
        deleteBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const currentName = nameInput.value.trim() || 'Knight';
          await musicStore.deleteTrack(currentName, track.slotIndex);
          currentCustomTracks = currentCustomTracks.filter(t => t.slotIndex !== track.slotIndex);
          if (currentActiveTrack === track.slotIndex) {
            currentActiveTrack = -1;
            musicManager.setTrack(-1, null);
          }
          renderTrackList();
        });
      }
    };

    if (isEditing) {
      // Pre-fill from saved settings
      const settings = this.saveSystem.loadSettings(profileName);
      nameInput.value = profileName;
      nameInput.readOnly = true;
      nameInput.classList.add('readonly');

      if (settings) {
        languageSelect.value = settings.language;
        setLocale(settings.language);
        localizeDOM();
        ageInput.value = String(settings.age);
        musicEnabledCb.checked = settings.musicEnabled !== false;
        musicVolumeSlider.value = String(Math.round((settings.musicVolume ?? 0.5) * 100));
        musicVolumeRow.style.display = musicEnabledCb.checked ? 'flex' : 'none';
        if (settings.llmProvider) {
          for (const r of providerRadios) {
            r.checked = r.value === settings.llmProvider;
          }
        }
        wizardApiKeyInput.value = settings.llmApiKey || '';
        populateModels(settings.llmProvider || 'openai', settings.llmModel);

        currentActiveTrack = settings.activeTrack ?? -1;
        currentCustomTracks = settings.customTracks ? [...settings.customTracks] : [];
        if (settings.cameraMode) cameraModeSelect.value = settings.cameraMode;
        revealMapCb.checked = settings.revealMap === true;
      } else {
        populateModels('openai');
      }

      const progress = this.saveSystem.loadProgress(profileName);
      if (progress) {
        startBtn.style.display = 'none';
        continueBtn.style.display = 'block';
      } else {
        startBtn.style.display = 'block';
        continueBtn.style.display = 'none';
      }

      // Show tracks section and load tracks from IndexedDB
      tracksSection.style.display = musicEnabledCb.checked ? 'block' : 'none';
      musicStore.loadTracks(profileName).then(tracks => {
        currentCustomTracks = tracks;
        renderTrackList();
      });
    } else {
      // New knight
      nameInput.value = '';
      nameInput.readOnly = false;
      nameInput.classList.remove('readonly');
      languageSelect.value = 'en';
      ageInput.value = '';
      musicEnabledCb.checked = true;
      musicVolumeSlider.value = '50';
      musicVolumeRow.style.display = 'flex';
      wizardApiKeyInput.value = '';
      for (const r of providerRadios) {
        r.checked = r.value === 'openai';
      }
      populateModels('openai');
      startBtn.style.display = 'block';
      continueBtn.style.display = 'none';
      revealMapCb.checked = false;

      tracksSection.style.display = musicEnabledCb.checked ? 'block' : 'none';
      renderTrackList();
    }

    // Show camera settings on desktop only
    const isMobile = 'ontouchstart' in window;
    cameraSettings.style.display = isMobile ? 'none' : 'block';

    // Start music playback when entering the form
    musicManager.applySettings(musicEnabledCb.checked, parseInt(musicVolumeSlider.value, 10) / 100);
    musicManager.play();

    // Show/hide back button
    backBtn.style.display = (hasProfiles || isEditing) ? 'block' : 'none';

    // Always show wizard API settings
    wizardApiSettings.style.display = 'block';

    // Reset API key visibility
    wizardApiKeyInput.type = 'password';
    apiKeyToggle.textContent = t('login.show');

    const onProviderChange = () => {
      const checked = Array.from(providerRadios).find(r => r.checked);
      if (checked) populateModels(checked.value);
    };

    const onLanguageChange = () => {
      setLocale(languageSelect.value as SupportedLanguage);
      localizeDOM();
    };

    const onMusicToggle = () => {
      musicVolumeRow.style.display = musicEnabledCb.checked ? 'flex' : 'none';
      tracksSection.style.display = musicEnabledCb.checked ? 'block' : 'none';
      musicManager.setEnabled(musicEnabledCb.checked);
    };

    const onMusicVolumeInput = () => {
      musicManager.setVolume(parseInt(musicVolumeSlider.value, 10) / 100);
    };

    const onApiKeyToggle = () => {
      if (wizardApiKeyInput.type === 'password') {
        wizardApiKeyInput.type = 'text';
        apiKeyToggle.textContent = t('login.hide');
      } else {
        wizardApiKeyInput.type = 'password';
        apiKeyToggle.textContent = t('login.show');
      }
    };

    // Upload track handler
    const onUploadTrackClick = () => trackFileInput.click();
    const onTrackFileChange = async () => {
      const file = trackFileInput.files?.[0];
      if (!file) return;
      trackFileInput.value = '';

      const currentName = nameInput.value.trim() || 'Knight';

      // Validate
      if (file.size > 10 * 1024 * 1024) {
        this.showTrackStatus(t('login.fileTooLarge'));
        return;
      }
      if (file.type !== 'audio/mpeg' && !file.name.endsWith('.mp3')) {
        this.showTrackStatus(t('login.invalidFormat'));
        return;
      }
      if (currentCustomTracks.length >= 3) {
        this.showTrackStatus(t('login.trackLimitReached'));
        return;
      }

      // Find first empty slot
      const usedSlots = new Set(currentCustomTracks.map(t => t.slotIndex));
      let slot = -1;
      for (let i = 0; i < 3; i++) {
        if (!usedSlots.has(i)) { slot = i; break; }
      }
      if (slot < 0) {
        this.showTrackStatus(t('login.trackLimitReached'));
        return;
      }

      await musicStore.saveTrack(currentName, slot, file);
      currentCustomTracks.push({ slotIndex: slot, fileName: file.name, size: file.size });
      renderTrackList();
    };

    // Export profile handler
    const onExportProfile = () => {
      const settings = buildSettings();
      this.saveSystem.downloadFullExport(settings);
    };

    const buildSettings = (): UserSettings => {
      const playerName = nameInput.value.trim() || 'Knight';
      const language = (languageSelect.value || 'en') as SupportedLanguage;
      const age = parseInt(ageInput.value, 10) || 18;
      let provider: LLMProvider | undefined;
      for (const r of providerRadios) {
        if (r.checked) { provider = r.value as LLMProvider; break; }
      }
      const apiKey = wizardApiKeyInput.value.trim() || undefined;
      const model = modelSelect.value || undefined;
      const cameraMode = cameraModeSelect.value as 'firstPerson' | 'firstPersonLocked' | 'thirdPerson';
      return {
        playerName,
        language,
        age,
        ageRange: computeAgeRange(age),
        musicEnabled: musicEnabledCb.checked,
        musicVolume: parseInt(musicVolumeSlider.value, 10) / 100,
        activeTrack: currentActiveTrack,
        customTracks: currentCustomTracks.length > 0 ? currentCustomTracks : undefined,
        cameraMode: cameraMode !== 'thirdPerson' ? cameraMode : undefined,
        revealMap: revealMapCb.checked || undefined,
        llmProvider: provider,
        llmApiKey: apiKey,
        llmModel: model,
        timestamp: Date.now(),
      };
    };

    const loadPlaylist = async (settings: UserSettings) => {
      const entries: PlaylistEntry[] = [{ trackIndex: -1, blobUrl: null }];
      if (settings.customTracks) {
        for (const track of settings.customTracks) {
          const blob = await musicStore.getTrackBlob(settings.playerName, track.slotIndex);
          if (blob) {
            entries.push({ trackIndex: track.slotIndex, blobUrl: URL.createObjectURL(blob) });
          }
        }
      }
      musicManager.setPlaylist(entries, settings.activeTrack ?? -1);
    };

    const validateApiKey = (): boolean => {
      if (!wizardApiKeyInput.value.trim()) {
        wizardApiKeyInput.style.borderColor = '#e94560';
        wizardApiKeyInput.setAttribute('placeholder', t('login.apiKeyRequired'));
        return false;
      }
      wizardApiKeyInput.style.borderColor = '';
      return true;
    };

    const onStart = async () => {
      if (!validateApiKey()) return;
      const settings = buildSettings();
      this.saveSystem.saveSettings(settings);
      musicManager.applySettings(settings.musicEnabled !== false, settings.musicVolume ?? 0.5);
      await loadPlaylist(settings);
      musicManager.play();
      this.finish();
      this.onStart(settings, 1, null);
    };

    const onContinue = async () => {
      if (!validateApiKey()) return;
      const settings = buildSettings();
      const save = this.saveSystem.loadProgress(settings.playerName);
      this.saveSystem.saveSettings(settings);
      musicManager.applySettings(settings.musicEnabled !== false, settings.musicVolume ?? 0.5);
      await loadPlaylist(settings);
      musicManager.play();
      this.finish();
      this.onStart(settings, save?.currentLevel || 1, save);
    };

    const onBack = () => {
      this.cleanup();
      const profiles = this.saveSystem.listProfiles();
      if (profiles.length > 0) {
        this.showProfileList();
      } else {
        this.showSettingsForm(null);
      }
    };

    const onKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        if (isEditing && continueBtn.style.display !== 'none') {
          onContinue();
        } else {
          onStart();
        }
      }
    };

    // Create export button if editing
    let exportBtn: HTMLButtonElement | null = null;
    if (isEditing) {
      exportBtn = document.createElement('button');
      exportBtn.className = 'overlay-btn secondary-btn';
      exportBtn.id = 'export-profile-btn';
      exportBtn.textContent = t('login.exportProfile');
      // Insert before back button
      backBtn.parentElement!.insertBefore(exportBtn, backBtn);
      exportBtn.addEventListener('click', onExportProfile);
    }

    musicEnabledCb.addEventListener('change', onMusicToggle);
    musicVolumeSlider.addEventListener('input', onMusicVolumeInput);
    apiKeyToggle.addEventListener('click', onApiKeyToggle);
    languageSelect.addEventListener('change', onLanguageChange);
    for (const r of providerRadios) r.addEventListener('change', onProviderChange);
    startBtn.addEventListener('click', onStart);
    continueBtn.addEventListener('click', onContinue);
    backBtn.addEventListener('click', onBack);
    nameInput.addEventListener('keydown', onKeydown);
    uploadTrackBtn.addEventListener('click', onUploadTrackClick);
    trackFileInput.addEventListener('change', onTrackFileChange);

    this.cleanupFn = () => {
      musicEnabledCb.removeEventListener('change', onMusicToggle);
      musicVolumeSlider.removeEventListener('input', onMusicVolumeInput);
      apiKeyToggle.removeEventListener('click', onApiKeyToggle);
      languageSelect.removeEventListener('change', onLanguageChange);
      for (const r of providerRadios) r.removeEventListener('change', onProviderChange);
      startBtn.removeEventListener('click', onStart);
      continueBtn.removeEventListener('click', onContinue);
      backBtn.removeEventListener('click', onBack);
      nameInput.removeEventListener('keydown', onKeydown);
      uploadTrackBtn.removeEventListener('click', onUploadTrackClick);
      trackFileInput.removeEventListener('change', onTrackFileChange);
      if (exportBtn) {
        exportBtn.removeEventListener('click', onExportProfile);
        exportBtn.remove();
      }
    };

    nameInput.focus();
  }

  private showTrackStatus(message: string): void {
    const trackList = document.getElementById('music-track-list')!;
    // Remove old status
    const old = trackList.parentElement?.querySelector('.music-track-status');
    if (old) old.remove();

    const statusEl = document.createElement('div');
    statusEl.className = 'music-track-status';
    statusEl.textContent = message;
    trackList.parentElement!.appendChild(statusEl);
    setTimeout(() => statusEl.remove(), 3000);
  }

  private cleanup(): void {
    if (this.cleanupFn) {
      this.cleanupFn();
      this.cleanupFn = null;
    }
  }

  private finish(): void {
    this.cleanup();
    const overlay = document.getElementById('login-overlay');
    if (overlay) overlay.style.display = 'none';
  }

  private timeAgo(timestamp: number): string {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return t('login.justNow');
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return t('login.minutesAgo', { n: minutes });
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return t('login.hoursAgo', { n: hours });
    const days = Math.floor(hours / 24);
    if (days < 30) return t('login.daysAgo', { n: days });
    const months = Math.floor(days / 30);
    return t('login.monthsAgo', { n: months });
  }

  exit(game: Game): void {
    const overlay = document.getElementById('login-overlay');
    if (overlay) overlay.style.display = 'none';
    this.cleanup();
  }

  update(game: Game, delta: number): void {
    // No-op — login is purely event-driven
  }
}
