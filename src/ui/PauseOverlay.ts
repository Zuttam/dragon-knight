import { t } from '../i18n';
import { musicManager } from '../audio/MusicManager';
import type { CustomTrackMeta } from '../audio/MusicStore';

export class PauseOverlay {
  private container: HTMLElement | null = null;
  private onResume: () => void;
  private onExportSave: () => void;
  private onExitDungeon: () => void;
  private onMusicSettingsChange?: (enabled: boolean, volume: number) => void;
  private onTrackChange?: (trackIndex: number) => void;
  private customTracks: CustomTrackMeta[] = [];

  constructor(
    onResume: () => void,
    onExportSave: () => void,
    onExitDungeon: () => void,
    onMusicSettingsChange?: (enabled: boolean, volume: number) => void,
    onTrackChange?: (trackIndex: number) => void
  ) {
    this.onResume = onResume;
    this.onExportSave = onExportSave;
    this.onExitDungeon = onExitDungeon;
    this.onMusicSettingsChange = onMusicSettingsChange;
    this.onTrackChange = onTrackChange;
  }

  setTrackInfo(customTracks: CustomTrackMeta[]): void {
    this.customTracks = customTracks;
  }

  show(): void {
    this.hide();
    this.container = document.createElement('div');
    this.container.id = 'pause-overlay';

    const musicChecked = musicManager.enabled ? 'checked' : '';
    const volumeVal = Math.round(musicManager.volume * 100);
    const volumeDisplay = musicManager.enabled ? 'flex' : 'none';

    // Build track selector options
    let trackOptions = `<option value="-1">${t('pause.defaultTheme')}</option>`;
    for (const track of this.customTracks) {
      const selected = musicManager.activeTrack === track.slotIndex ? 'selected' : '';
      trackOptions += `<option value="${track.slotIndex}" ${selected}>${track.fileName}</option>`;
    }
    const trackRowDisplay = (musicManager.enabled && this.customTracks.length > 0) ? 'flex' : 'none';

    this.container.innerHTML = `
      <div class="pause-box">
        <h2>${t('pause.title')}</h2>
        <button id="resume-btn" class="overlay-btn primary-btn">${t('pause.resume')}</button>
        <div class="pause-music-section">
          <label class="toggle-row">
            <input type="checkbox" id="pause-music-toggle" ${musicChecked} />
            <span>${t('pause.music')}</span>
          </label>
          <div id="pause-music-volume-row" class="pause-volume-row" style="display: ${volumeDisplay};">
            <label class="volume-label">${t('pause.musicVolume')}</label>
            <input type="range" id="pause-music-volume" min="0" max="100" value="${volumeVal}" class="volume-slider" />
          </div>
          <div id="pause-track-row" class="pause-track-row" style="display: ${trackRowDisplay};">
            <label class="volume-label">${t('pause.track')}</label>
            <select id="pause-track-select" class="pause-track-select">${trackOptions}</select>
          </div>
        </div>
        <button id="export-save-btn" class="overlay-btn secondary-btn">${t('pause.exportSave')}</button>
        <button id="exit-dungeon-btn" class="overlay-btn secondary-btn">${t('pause.exitDungeon')}</button>
      </div>
    `;
    document.body.appendChild(this.container);

    document.getElementById('resume-btn')!.addEventListener('click', () => this.onResume());
    document.getElementById('export-save-btn')!.addEventListener('click', () => this.onExportSave());
    document.getElementById('exit-dungeon-btn')!.addEventListener('click', () => this.onExitDungeon());

    const toggle = document.getElementById('pause-music-toggle') as HTMLInputElement;
    const volumeRow = document.getElementById('pause-music-volume-row')!;
    const volumeSlider = document.getElementById('pause-music-volume') as HTMLInputElement;
    const trackRow = document.getElementById('pause-track-row')!;
    const trackSelect = document.getElementById('pause-track-select') as HTMLSelectElement;

    toggle.addEventListener('change', () => {
      musicManager.setEnabled(toggle.checked);
      volumeRow.style.display = toggle.checked ? 'flex' : 'none';
      trackRow.style.display = (toggle.checked && this.customTracks.length > 0) ? 'flex' : 'none';
      this.onMusicSettingsChange?.(toggle.checked, musicManager.volume);
    });

    volumeSlider.addEventListener('input', () => {
      const v = parseInt(volumeSlider.value, 10) / 100;
      musicManager.setVolume(v);
      this.onMusicSettingsChange?.(musicManager.enabled, v);
    });

    trackSelect.addEventListener('change', () => {
      const trackIndex = parseInt(trackSelect.value, 10);
      this.onTrackChange?.(trackIndex);
    });
  }

  hide(): void {
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
  }
}
