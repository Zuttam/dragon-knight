export interface SaveData {
  playerName: string;
  currentLevel: number;
  levelsCompleted: number;
  totalTreasures: number;
  maxHP: number;
  baseAttackPower: number;
  timestamp: number;
}

const SAVE_PREFIX = 'save:';

export class SaveSystem {
  saveGame(data: SaveData): void {
    const key = SAVE_PREFIX + data.playerName;
    data.timestamp = Date.now();
    localStorage.setItem(key, JSON.stringify(data));
  }

  loadGame(playerName: string): SaveData | null {
    const key = SAVE_PREFIX + playerName;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as SaveData;
    } catch {
      return null;
    }
  }

  hasSave(playerName: string): boolean {
    return localStorage.getItem(SAVE_PREFIX + playerName) !== null;
  }

  deleteSave(playerName: string): void {
    localStorage.removeItem(SAVE_PREFIX + playerName);
  }

  exportToMarkdown(data: SaveData): string {
    const date = new Date(data.timestamp).toLocaleString();
    return `# Dragon-Knight Save File
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

  importFromMarkdown(content: string): SaveData | null {
    try {
      const getName = (label: string) => {
        const match = content.match(new RegExp(`\\*\\*${label}:\\*\\*\\s*(.+)`));
        return match?.[1]?.trim() || '';
      };
      const getNum = (label: string) => {
        const val = getName(label);
        return parseInt(val, 10) || 0;
      };

      const playerMatch = content.match(/## Player:\s*(.+)/);
      const playerName = playerMatch?.[1]?.trim() || 'Knight';

      return {
        playerName,
        currentLevel: getNum('Current Level'),
        levelsCompleted: getNum('Levels Completed'),
        totalTreasures: getNum('Total Treasures Collected'),
        maxHP: getNum('Max HP') || 100,
        baseAttackPower: getNum('Base Attack Power') || 10,
        timestamp: Date.now(),
      };
    } catch {
      return null;
    }
  }

  downloadSave(data: SaveData): void {
    const md = this.exportToMarkdown(data);
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.playerName}.progress.md`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
