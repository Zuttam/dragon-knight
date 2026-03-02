export interface TrackRecord {
  id: string;
  playerName: string;
  slotIndex: number;
  fileName: string;
  blob: Blob;
  size: number;
  addedAt: number;
}

export interface CustomTrackMeta {
  slotIndex: number;
  fileName: string;
  size: number;
}

const DB_NAME = 'dragon-knight-music';
const STORE_NAME = 'tracks';
const DB_VERSION = 1;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_SLOTS = 3;

class MusicStore {
  private db: IDBDatabase | null = null;

  async open(): Promise<void> {
    if (this.db) return;
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  private makeKey(playerName: string, slot: number): string {
    return `${playerName}:${slot}`;
  }

  async saveTrack(playerName: string, slot: number, file: File): Promise<void> {
    if (slot < 0 || slot >= MAX_SLOTS) throw new Error('Invalid slot');
    if (file.size > MAX_FILE_SIZE) throw new Error('File too large');
    if (file.type !== 'audio/mpeg' && !file.name.endsWith('.mp3')) throw new Error('Invalid format');
    await this.ensureOpen();

    const record: TrackRecord = {
      id: this.makeKey(playerName, slot),
      playerName,
      slotIndex: slot,
      fileName: file.name,
      blob: file,
      size: file.size,
      addedAt: Date.now(),
    };

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async loadTracks(playerName: string): Promise<CustomTrackMeta[]> {
    await this.ensureOpen();
    const metas: CustomTrackMeta[] = [];
    for (let i = 0; i < MAX_SLOTS; i++) {
      const record = await this.getRecord(playerName, i);
      if (record) {
        metas.push({ slotIndex: record.slotIndex, fileName: record.fileName, size: record.size });
      }
    }
    return metas;
  }

  async getTrackBlob(playerName: string, slot: number): Promise<Blob | null> {
    const record = await this.getRecord(playerName, slot);
    return record?.blob ?? null;
  }

  async deleteTrack(playerName: string, slot: number): Promise<void> {
    await this.ensureOpen();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(this.makeKey(playerName, slot));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async deleteAllTracks(playerName: string): Promise<void> {
    await this.ensureOpen();
    const tx = this.db!.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    for (let i = 0; i < MAX_SLOTS; i++) {
      store.delete(this.makeKey(playerName, i));
    }
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async exportTracks(playerName: string): Promise<TrackRecord[]> {
    await this.ensureOpen();
    const records: TrackRecord[] = [];
    for (let i = 0; i < MAX_SLOTS; i++) {
      const record = await this.getRecord(playerName, i);
      if (record) records.push(record);
    }
    return records;
  }

  async importTrack(playerName: string, slot: number, fileName: string, blob: Blob): Promise<void> {
    await this.ensureOpen();
    const record: TrackRecord = {
      id: this.makeKey(playerName, slot),
      playerName,
      slotIndex: slot,
      fileName,
      blob,
      size: blob.size,
      addedAt: Date.now(),
    };
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  private async getRecord(playerName: string, slot: number): Promise<TrackRecord | null> {
    await this.ensureOpen();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readonly');
      const request = tx.objectStore(STORE_NAME).get(this.makeKey(playerName, slot));
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error);
    });
  }

  private async ensureOpen(): Promise<void> {
    if (!this.db) await this.open();
  }
}

export const musicStore = new MusicStore();
