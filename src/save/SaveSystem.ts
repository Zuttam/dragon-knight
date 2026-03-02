import { musicStore, type CustomTrackMeta } from '../audio/MusicStore';

export type SupportedLanguage =
  | 'en' | 'es' | 'fr' | 'de' | 'it' | 'pt'
  | 'ja' | 'ko' | 'zh' | 'ar' | 'he' | 'ru';

export type AgeRange = 'child' | 'teen' | 'adult';

export type LLMProvider = 'anthropic' | 'openai';

export interface UserSettings {
  playerName: string;
  language: SupportedLanguage;
  age: number;
  ageRange: AgeRange;
  llmProvider?: LLMProvider;
  llmApiKey?: string;
  llmModel?: string;
  musicEnabled?: boolean;
  musicVolume?: number;
  activeTrack?: number;
  customTracks?: CustomTrackMeta[];
  timestamp: number;
}

export interface ProfileSummary {
  playerName: string;
  language: SupportedLanguage;
  currentLevel: number;
  lastPlayed: number;
}

export interface SaveData {
  playerName: string;
  currentLevel: number;
  levelsCompleted: number;
  totalTreasures: number;
  maxHP: number;
  baseAttackPower: number;
  timestamp: number;
}

export function computeAgeRange(age: number): AgeRange {
  if (age < 13) return 'child';
  if (age < 18) return 'teen';
  return 'adult';
}

const LEGACY_PREFIX = 'save:';
const SETTINGS_PREFIX = 'user:';
const SETTINGS_SUFFIX = ':settings';
const PROGRESS_SUFFIX = ':progress';

export class SaveSystem {
  // ── Settings ──────────────────────────────────────────────

  saveSettings(settings: UserSettings): void {
    const key = SETTINGS_PREFIX + settings.playerName + SETTINGS_SUFFIX;
    settings.timestamp = Date.now();
    localStorage.setItem(key, JSON.stringify(settings));
  }

  loadSettings(playerName: string): UserSettings | null {
    const key = SETTINGS_PREFIX + playerName + SETTINGS_SUFFIX;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as UserSettings;
    } catch {
      return null;
    }
  }

  // ── Progress ──────────────────────────────────────────────

  saveProgress(data: SaveData): void {
    const key = SETTINGS_PREFIX + data.playerName + PROGRESS_SUFFIX;
    data.timestamp = Date.now();
    localStorage.setItem(key, JSON.stringify(data));
  }

  loadProgress(playerName: string): SaveData | null {
    const key = SETTINGS_PREFIX + playerName + PROGRESS_SUFFIX;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as SaveData;
    } catch {
      return null;
    }
  }

  hasUser(playerName: string): boolean {
    return (
      localStorage.getItem(SETTINGS_PREFIX + playerName + SETTINGS_SUFFIX) !== null ||
      localStorage.getItem(SETTINGS_PREFIX + playerName + PROGRESS_SUFFIX) !== null ||
      localStorage.getItem(LEGACY_PREFIX + playerName) !== null
    );
  }

  // ── Legacy migration ─────────────────────────────────────

  migrateLegacySave(playerName: string): { settings: UserSettings; progress: SaveData | null } | null {
    const legacyKey = LEGACY_PREFIX + playerName;
    const raw = localStorage.getItem(legacyKey);
    if (!raw) return null;

    // Already migrated? Skip
    if (this.loadSettings(playerName)) return null;

    try {
      const legacy = JSON.parse(raw) as SaveData;

      const settings: UserSettings = {
        playerName,
        language: 'en',
        age: 18,
        ageRange: 'adult',
        timestamp: Date.now(),
      };
      this.saveSettings(settings);

      const progress: SaveData = {
        playerName: legacy.playerName,
        currentLevel: legacy.currentLevel,
        levelsCompleted: legacy.levelsCompleted,
        totalTreasures: legacy.totalTreasures,
        maxHP: legacy.maxHP || 100,
        baseAttackPower: legacy.baseAttackPower || 10,
        timestamp: Date.now(),
      };
      this.saveProgress(progress);

      // Remove legacy key
      localStorage.removeItem(legacyKey);

      return { settings, progress };
    } catch {
      return null;
    }
  }

  // ── Profile listing ──────────────────────────────────────

  listProfiles(): ProfileSummary[] {
    const profiles: ProfileSummary[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(SETTINGS_PREFIX) || !key.endsWith(SETTINGS_SUFFIX)) continue;
      const playerName = key.slice(SETTINGS_PREFIX.length, -SETTINGS_SUFFIX.length);
      const settings = this.loadSettings(playerName);
      if (!settings) continue;
      const progress = this.loadProgress(playerName);
      profiles.push({
        playerName,
        language: settings.language,
        currentLevel: progress?.currentLevel || 1,
        lastPlayed: Math.max(settings.timestamp, progress?.timestamp || 0),
      });
    }
    profiles.sort((a, b) => b.lastPlayed - a.lastPlayed);
    return profiles;
  }

  async deleteProfile(playerName: string): Promise<void> {
    this.deleteSave(playerName);
    await musicStore.deleteAllTracks(playerName);
  }

  // ── Backward-compatible aliases ───────────────────────────

  saveGame(data: SaveData): void {
    this.saveProgress(data);
  }

  loadGame(playerName: string): SaveData | null {
    return this.loadProgress(playerName);
  }

  hasSave(playerName: string): boolean {
    return this.hasUser(playerName);
  }

  deleteSave(playerName: string): void {
    localStorage.removeItem(SETTINGS_PREFIX + playerName + SETTINGS_SUFFIX);
    localStorage.removeItem(SETTINGS_PREFIX + playerName + PROGRESS_SUFFIX);
    localStorage.removeItem(LEGACY_PREFIX + playerName);
  }

  // ── Markdown export ───────────────────────────────────────

  exportSettingsToMarkdown(settings: UserSettings): string {
    const date = new Date(settings.timestamp).toLocaleString();
    return `# Dragon-Knight Settings
## Player: ${settings.playerName}
### Preferences
- **Language:** ${settings.language}
- **Age:** ${settings.age}
- **Age Range:** ${settings.ageRange}
### Meta
- **Saved:** ${date}
`;
  }

  exportToMarkdown(data: SaveData): string {
    const date = new Date(data.timestamp).toLocaleString();
    return `# Dragon-Knight Progress
## Player: ${data.playerName}
### Progress
- **Current Level:** ${data.currentLevel}
- **Levels Completed:** ${data.levelsCompleted}
- **Total Treasures Collected:** ${data.totalTreasures}
### Stats
- **Max HP:** ${data.maxHP}
- **Base Attack Power:** ${data.baseAttackPower}
### Meta
- **Saved:** ${date}
`;
  }

  // ── Markdown import ───────────────────────────────────────

  private extractMarkdownField(content: string, label: string): string {
    const match = content.match(new RegExp(`\\*\\*${label}:\\*\\*\\s*(.+)`));
    return match?.[1]?.trim() || '';
  }

  private extractMarkdownNum(content: string, label: string): number {
    return parseInt(this.extractMarkdownField(content, label), 10) || 0;
  }

  private extractPlayerName(content: string): string {
    const playerMatch = content.match(/## Player:\s*(.+)/);
    return playerMatch?.[1]?.trim() || 'Knight';
  }

  importFromMarkdown(content: string): SaveData | null {
    // Detect file type by header
    if (content.includes('# Dragon-Knight Settings')) {
      return this.importSettingsFromMarkdown(content);
    }
    return this.importProgressFromMarkdown(content);
  }

  private importSettingsFromMarkdown(content: string): SaveData | null {
    try {
      const playerName = this.extractPlayerName(content);
      const language = (this.extractMarkdownField(content, 'Language') || 'en') as SupportedLanguage;
      const age = parseInt(this.extractMarkdownField(content, 'Age'), 10) || 18;

      const settings: UserSettings = {
        playerName,
        language,
        age,
        ageRange: computeAgeRange(age),
        timestamp: Date.now(),
      };
      this.saveSettings(settings);

      // Return a minimal SaveData so the caller can use the playerName
      const existingProgress = this.loadProgress(playerName);
      return existingProgress || {
        playerName,
        currentLevel: 1,
        levelsCompleted: 0,
        totalTreasures: 0,
        maxHP: 100,
        baseAttackPower: 10,
        timestamp: Date.now(),
      };
    } catch {
      return null;
    }
  }

  private importProgressFromMarkdown(content: string): SaveData | null {
    try {
      const playerName = this.extractPlayerName(content);

      return {
        playerName,
        currentLevel: this.extractMarkdownNum(content, 'Current Level'),
        levelsCompleted: this.extractMarkdownNum(content, 'Levels Completed'),
        totalTreasures: this.extractMarkdownNum(content, 'Total Treasures Collected'),
        maxHP: this.extractMarkdownNum(content, 'Max HP') || 100,
        baseAttackPower: this.extractMarkdownNum(content, 'Base Attack Power') || 10,
        timestamp: Date.now(),
      };
    } catch {
      return null;
    }
  }

  // ── Downloads ─────────────────────────────────────────────

  downloadSettings(settings: UserSettings): void {
    const md = this.exportSettingsToMarkdown(settings);
    this.downloadFile(md, `${settings.playerName}.settings.md`);
  }

  downloadProgress(data: SaveData): void {
    const md = this.exportToMarkdown(data);
    this.downloadFile(md, `${data.playerName}.progress.md`);
  }

  downloadSave(data: SaveData): void {
    this.downloadProgress(data);
  }

  private downloadFile(content: string, filename: string): void {
    this.downloadBlob(new Blob([content], { type: 'text/markdown' }), filename);
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── ZIP export ──────────────────────────────────────────

  async downloadFullExport(settings: UserSettings): Promise<void> {
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();

    zip.file('settings.json', JSON.stringify(settings, null, 2));

    const progress = this.loadProgress(settings.playerName);
    if (progress) {
      zip.file('progress.json', JSON.stringify(progress, null, 2));
    }

    const tracks = await musicStore.exportTracks(settings.playerName);
    for (const track of tracks) {
      zip.file(`tracks/${track.slotIndex}_${track.fileName}`, track.blob);
    }

    const blob = await zip.generateAsync({ type: 'blob' });
    this.downloadBlob(blob, `${settings.playerName}.dragonknight`);
  }

  // ── ZIP / Markdown import ───────────────────────────────

  async importFromFile(file: File): Promise<SaveData | null> {
    const header = await this.readFileHeader(file, 2);
    if (header === 'PK') {
      return this.importFromZip(file);
    }
    // Legacy markdown import
    const content = await this.readFileAsText(file);
    return this.importFromMarkdown(content);
  }

  private async importFromZip(file: File): Promise<SaveData | null> {
    try {
      const JSZip = (await import('jszip')).default;
      const zip = await JSZip.loadAsync(file);

      const settingsFile = zip.file('settings.json');
      if (!settingsFile) return null;
      const settingsJson = await settingsFile.async('string');
      const settings = JSON.parse(settingsJson) as UserSettings;
      this.saveSettings(settings);

      let progress: SaveData | null = null;
      const progressFile = zip.file('progress.json');
      if (progressFile) {
        const progressJson = await progressFile.async('string');
        progress = JSON.parse(progressJson) as SaveData;
        this.saveProgress(progress);
      }

      // Import tracks
      const trackFiles = zip.folder('tracks');
      if (trackFiles) {
        // Clear existing tracks first
        await musicStore.deleteAllTracks(settings.playerName);
        const trackMeta: CustomTrackMeta[] = [];

        for (const [relativePath, zipEntry] of Object.entries(zip.files)) {
          if (!relativePath.startsWith('tracks/') || zipEntry.dir) continue;
          const fileName = relativePath.replace('tracks/', '');
          // Parse slot index from "0_filename.mp3" format
          const underscoreIdx = fileName.indexOf('_');
          if (underscoreIdx < 0) continue;
          const slot = parseInt(fileName.substring(0, underscoreIdx), 10);
          const originalName = fileName.substring(underscoreIdx + 1);
          if (isNaN(slot) || slot < 0 || slot >= 3) continue;

          const blob = await zipEntry.async('blob');
          await musicStore.importTrack(settings.playerName, slot, originalName, blob);
          trackMeta.push({ slotIndex: slot, fileName: originalName, size: blob.size });
        }

        if (trackMeta.length > 0) {
          settings.customTracks = trackMeta;
          this.saveSettings(settings);
        }
      }

      return progress || {
        playerName: settings.playerName,
        currentLevel: 1,
        levelsCompleted: 0,
        totalTreasures: 0,
        maxHP: 100,
        baseAttackPower: 10,
        timestamp: Date.now(),
      };
    } catch {
      return null;
    }
  }

  private readFileHeader(file: File, bytes: number): Promise<string> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string || '');
      reader.readAsText(file.slice(0, bytes));
    });
  }

  private readFileAsText(file: File): Promise<string> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string || '');
      reader.readAsText(file);
    });
  }
}
