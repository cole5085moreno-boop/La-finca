import { DEFAULT_SETTINGS } from '../data';
import { GameSettings, SaveSlotData } from '../types';

const SETTINGS_KEY = 'la_finca_settings_v1';
const SAVES_KEY = 'la_finca_saves_v1';
const CODEX_KEY = 'la_finca_codex_v1';

export class SaveManager {
  static loadSettings(): GameSettings {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw) return { ...DEFAULT_SETTINGS };
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  static saveSettings(settings: GameSettings): void {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      // Ignore storage quota errors
    }
  }

  static listSaves(): SaveSlotData[] {
    try {
      const raw = localStorage.getItem(SAVES_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as SaveSlotData[];
      return Array.isArray(parsed)
        ? parsed.sort((a, b) => b.timestamp - a.timestamp)
        : [];
    } catch {
      return [];
    }
  }

  static saveToSlot(data: SaveSlotData): void {
    try {
      const existing = this.listSaves().filter((s) => s.slotId !== data.slotId);
      existing.unshift(data);
      localStorage.setItem(SAVES_KEY, JSON.stringify(existing.slice(0, 6)));
      this.mergeUnlockedCodex(data.unlockedCreatures);
    } catch {
      // Ignore storage quota errors
    }
  }

  static deleteSlot(slotId: string): void {
    try {
      const remaining = this.listSaves().filter((s) => s.slotId !== slotId);
      localStorage.setItem(SAVES_KEY, JSON.stringify(remaining));
    } catch {
      // Ignore storage errors
    }
  }

  static getLatestSave(): SaveSlotData | null {
    const saves = this.listSaves();
    return saves.length > 0 ? saves[0] : null;
  }

  static getUnlockedCodex(): string[] {
    try {
      const raw = localStorage.getItem(CODEX_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  static mergeUnlockedCodex(ids: string[]): void {
    try {
      const current = new Set(this.getUnlockedCodex());
      ids.forEach((id) => current.add(id));
      localStorage.setItem(CODEX_KEY, JSON.stringify(Array.from(current)));
    } catch {
      // Ignore storage errors
    }
  }
}
