const DEFAULT_SRC = '/Dragon-Knight-theme.mp3';

export class MusicManager {
  private audio: HTMLAudioElement;
  private _enabled: boolean = true;
  private _volume: number = 0.5;
  private started: boolean = false;
  private _activeTrack: number = -1; // -1 = default theme
  private customBlobUrl: string | null = null;

  constructor() {
    this.audio = new Audio(DEFAULT_SRC);
    this.audio.loop = true;
    this.audio.preload = 'auto';
    this.audio.volume = this._volume;
    this.audio.onerror = () => {
      // Fallback to default theme if custom track fails
      if (this._activeTrack >= 0) {
        this._activeTrack = -1;
        this.revokeBlobUrl();
        this.audio.src = DEFAULT_SRC;
        if (this.started && this._enabled) {
          this.audio.play().catch(() => {});
        }
      }
    };
  }

  get enabled(): boolean { return this._enabled; }
  get volume(): number { return this._volume; }
  get activeTrack(): number { return this._activeTrack; }

  play(): void {
    this.started = true;
    if (this._enabled) {
      this.audio.play().catch(() => {});
    }
  }

  stop(): void {
    this.started = false;
    this.audio.pause();
    this.audio.currentTime = 0;
  }

  setEnabled(on: boolean): void {
    this._enabled = on;
    if (!on) {
      this.audio.pause();
    } else if (this.started) {
      this.audio.play().catch(() => {});
    }
  }

  setVolume(v: number): void {
    this._volume = Math.max(0, Math.min(1, v));
    this.audio.volume = this._volume;
  }

  applySettings(enabled: boolean, volume: number): void {
    this._enabled = enabled;
    this._volume = Math.max(0, Math.min(1, volume));
    this.audio.volume = this._volume;
  }

  setTrack(trackIndex: number, blobUrl: string | null): void {
    const wasPlaying = this.started && this._enabled && !this.audio.paused;
    this.audio.pause();
    this.revokeBlobUrl();

    this._activeTrack = trackIndex;
    if (trackIndex >= 0 && blobUrl) {
      this.customBlobUrl = blobUrl;
      this.audio.src = blobUrl;
    } else {
      this._activeTrack = -1;
      this.audio.src = DEFAULT_SRC;
    }

    this.audio.currentTime = 0;
    if (wasPlaying) {
      this.audio.play().catch(() => {});
    }
  }

  dispose(): void {
    this.audio.pause();
    this.audio.currentTime = 0;
    this.revokeBlobUrl();
    this._activeTrack = -1;
    this.audio.src = DEFAULT_SRC;
  }

  private revokeBlobUrl(): void {
    if (this.customBlobUrl) {
      URL.revokeObjectURL(this.customBlobUrl);
      this.customBlobUrl = null;
    }
  }
}

export const musicManager = new MusicManager();
