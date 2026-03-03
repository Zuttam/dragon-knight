const DEFAULT_SRC = '/assets/audio/Dragon-Knight-theme.mp3';

export interface PlaylistEntry {
  trackIndex: number;  // -1 = default theme, 0+ = custom slot
  blobUrl: string | null;  // null for default theme
}

export class MusicManager {
  private audio: HTMLAudioElement;
  private _enabled: boolean = true;
  private _volume: number = 0.5;
  private started: boolean = false;
  private _activeTrack: number = -1; // -1 = default theme
  private customBlobUrl: string | null = null;

  // Playlist state
  private playlist: PlaylistEntry[] = [];
  private playlistPos: number = 0;
  private playlistBlobUrls: string[] = [];

  constructor() {
    this.audio = new Audio(DEFAULT_SRC);
    this.audio.preload = 'auto';
    this.audio.volume = this._volume;

    this.audio.addEventListener('ended', () => this.onTrackEnded());

    this.audio.onerror = () => {
      if (this._activeTrack >= 0) {
        if (this.playlist.length > 1) {
          this.advanceTrack();
        } else {
          this._activeTrack = -1;
          this.revokeBlobUrl();
          this.audio.src = DEFAULT_SRC;
          if (this.started && this._enabled) {
            this.audio.play().catch(() => {});
          }
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

  /** Single-track mode (used for preview in login screen). Clears any playlist. */
  setTrack(trackIndex: number, blobUrl: string | null): void {
    const wasPlaying = this.started && this._enabled && !this.audio.paused;
    this.audio.pause();
    this.revokeAllUrls();

    this.playlist = [];
    this.playlistPos = 0;

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

  /** Set up a playlist of tracks to cycle through. */
  setPlaylist(entries: PlaylistEntry[], activeTrackIndex: number = -1): void {
    const wasPlaying = this.started && this._enabled && !this.audio.paused;
    this.audio.pause();
    this.revokeAllUrls();

    this.playlist = entries;
    this.playlistBlobUrls = entries
      .map(e => e.blobUrl)
      .filter((u): u is string => u !== null);

    const idx = entries.findIndex(e => e.trackIndex === activeTrackIndex);
    this.playlistPos = idx >= 0 ? idx : 0;

    if (entries.length > 0) {
      const entry = entries[this.playlistPos];
      this._activeTrack = entry.trackIndex;
      if (entry.trackIndex >= 0 && entry.blobUrl) {
        this.audio.src = entry.blobUrl;
      } else {
        this.audio.src = DEFAULT_SRC;
      }
    } else {
      this._activeTrack = -1;
      this.audio.src = DEFAULT_SRC;
    }

    this.audio.currentTime = 0;
    if (wasPlaying) {
      this.audio.play().catch(() => {});
    }
  }

  /** Jump to a specific track within the current playlist. */
  jumpTo(trackIndex: number): void {
    const idx = this.playlist.findIndex(e => e.trackIndex === trackIndex);
    if (idx < 0) return;

    const wasPlaying = this.started && this._enabled && !this.audio.paused;
    this.audio.pause();

    this.playlistPos = idx;
    const entry = this.playlist[idx];
    this._activeTrack = entry.trackIndex;

    if (entry.trackIndex >= 0 && entry.blobUrl) {
      this.audio.src = entry.blobUrl;
    } else {
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
    this.revokeAllUrls();
    this.playlist = [];
    this.playlistPos = 0;
    this._activeTrack = -1;
    this.audio.src = DEFAULT_SRC;
  }

  private onTrackEnded(): void {
    if (this.playlist.length > 1) {
      this.advanceTrack();
    } else {
      // Single track or single-entry playlist — loop
      this.audio.currentTime = 0;
      if (this.started && this._enabled) {
        this.audio.play().catch(() => {});
      }
    }
  }

  private advanceTrack(): void {
    this.playlistPos = (this.playlistPos + 1) % this.playlist.length;
    const entry = this.playlist[this.playlistPos];
    this._activeTrack = entry.trackIndex;

    if (entry.trackIndex >= 0 && entry.blobUrl) {
      this.audio.src = entry.blobUrl;
    } else {
      this.audio.src = DEFAULT_SRC;
    }

    this.audio.currentTime = 0;
    if (this.started && this._enabled) {
      this.audio.play().catch(() => {});
    }
  }

  private revokeAllUrls(): void {
    this.revokeBlobUrl();
    for (const url of this.playlistBlobUrls) {
      URL.revokeObjectURL(url);
    }
    this.playlistBlobUrls = [];
  }

  private revokeBlobUrl(): void {
    if (this.customBlobUrl) {
      URL.revokeObjectURL(this.customBlobUrl);
      this.customBlobUrl = null;
    }
  }
}

export const musicManager = new MusicManager();
