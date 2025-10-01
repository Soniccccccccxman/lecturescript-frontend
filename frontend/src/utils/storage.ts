import { openDB, type IDBPDatabase } from 'idb';
import type { LectureSession, UsageStats, AppSettings } from '../types';

const DB_NAME = 'LectureTranscriptionDB';
const DB_VERSION = 1;

class StorageManager {
  private db: IDBPDatabase | null = null;

  async initialize(): Promise<void> {
    if (this.db) return;

    this.db = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Sessions store
        if (!db.objectStoreNames.contains('sessions')) {
          const sessionStore = db.createObjectStore('sessions', { keyPath: 'id' });
          sessionStore.createIndex('timestamp', 'startTime');
          sessionStore.createIndex('status', 'status');
        }

        // Settings store
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }

        // Usage stats store
        if (!db.objectStoreNames.contains('usage')) {
          db.createObjectStore('usage', { keyPath: 'id' });
        }

        // Audio blobs store (temporary)
        if (!db.objectStoreNames.contains('audio')) {
          db.createObjectStore('audio', { keyPath: 'sessionId' });
        }
      },
    });
  }

  // Session management
  async saveSession(session: LectureSession): Promise<void> {
    if (!this.db) await this.initialize();
    await this.db!.put('sessions', session);
  }

  async getSession(id: string): Promise<LectureSession | undefined> {
    if (!this.db) await this.initialize();
    return await this.db!.get('sessions', id);
  }

  async getAllSessions(): Promise<LectureSession[]> {
    if (!this.db) await this.initialize();
    return await this.db!.getAll('sessions');
  }

  async getRecentSessions(limit: number = 10): Promise<LectureSession[]> {
    if (!this.db) await this.initialize();
    const tx = this.db!.transaction('sessions', 'readonly');
    const index = tx.store.index('timestamp');
    const sessions = await index.getAll();
    return sessions
      .sort((a, b) => b.startTime - a.startTime)
      .slice(0, limit);
  }

  async deleteSession(id: string): Promise<void> {
    if (!this.db) await this.initialize();
    const tx = this.db!.transaction(['sessions', 'audio'], 'readwrite');
    await Promise.all([
      tx.objectStore('sessions').delete(id),
      tx.objectStore('audio').delete(id)
    ]);
  }

  // Settings management
  async saveSettings(settings: AppSettings): Promise<void> {
    if (!this.db) await this.initialize();
    await this.db!.put('settings', { key: 'app', value: settings });
  }

  async getSettings(): Promise<AppSettings | null> {
    if (!this.db) await this.initialize();
    const result = await this.db!.get('settings', 'app');
    return result?.value || null;
  }

  async saveSetting<K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ): Promise<void> {
    const currentSettings = await this.getSettings() || this.getDefaultSettings();
    currentSettings[key] = value;
    await this.saveSettings(currentSettings);
  }

  // Usage stats management
  async updateUsageStats(minutes: number, cost: number): Promise<void> {
    if (!this.db) await this.initialize();

    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const currentStats = await this.getUsageStats();

    const updatedStats: UsageStats = {
      totalMinutes: currentStats.totalMinutes + minutes,
      totalCost: currentStats.totalCost + cost,
      sessionsCount: currentStats.sessionsCount + 1,
      currentMonthUsage: currentStats.currentMonthUsage + minutes,
      currentMonthCost: currentStats.currentMonthCost + cost,
    };

    await this.db!.put('usage', { id: 'current', ...updatedStats });
    await this.db!.put('usage', {
      id: `month-${currentMonth}`,
      month: currentMonth,
      minutes,
      cost
    });
  }

  async getUsageStats(): Promise<UsageStats> {
    if (!this.db) await this.initialize();

    const current = await this.db!.get('usage', 'current');
    if (current) {
      return {
        totalMinutes: current.totalMinutes,
        totalCost: current.totalCost,
        sessionsCount: current.sessionsCount,
        currentMonthUsage: current.currentMonthUsage,
        currentMonthCost: current.currentMonthCost,
      };
    }

    return {
      totalMinutes: 0,
      totalCost: 0,
      sessionsCount: 0,
      currentMonthUsage: 0,
      currentMonthCost: 0,
    };
  }

  // Audio blob management (temporary storage)
  async saveAudioBlob(sessionId: string, blob: Blob): Promise<void> {
    if (!this.db) await this.initialize();
    await this.db!.put('audio', { sessionId, blob, timestamp: Date.now() });
  }

  async getAudioBlob(sessionId: string): Promise<Blob | undefined> {
    if (!this.db) await this.initialize();
    const result = await this.db!.get('audio', sessionId);
    return result?.blob;
  }

  async deleteAudioBlob(sessionId: string): Promise<void> {
    if (!this.db) await this.initialize();
    await this.db!.delete('audio', sessionId);
  }

  // Cleanup old audio blobs (keep only last 24 hours)
  async cleanupOldAudioBlobs(): Promise<void> {
    if (!this.db) await this.initialize();
    const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago

    const tx = this.db!.transaction('audio', 'readwrite');
    const store = tx.objectStore('audio');
    const cursor = await store.openCursor();

    while (cursor) {
      if (cursor.value.timestamp < cutoff) {
        await cursor.delete();
      }
      cursor.continue();
    }
  }

  // Utility methods
  getDefaultSettings(): AppSettings {
    return {
      autoSave: true,
      offlineMode: false,
      notifications: true,
      theme: 'auto',
      defaultLanguage: 'mixed',
      chunkDuration: 30,
      apiSettings: {
        openaiApiKey: '',
        model: 'whisper-1',
        temperature: 0,
      },
    };
  }

  async clearAllData(): Promise<void> {
    if (!this.db) await this.initialize();

    const tx = this.db!.transaction(['sessions', 'settings', 'usage', 'audio'], 'readwrite');
    await Promise.all([
      tx.objectStore('sessions').clear(),
      tx.objectStore('settings').clear(),
      tx.objectStore('usage').clear(),
      tx.objectStore('audio').clear(),
    ]);
  }

  async exportData(): Promise<string> {
    const sessions = await this.getAllSessions();
    const settings = await this.getSettings();
    const usage = await this.getUsageStats();

    return JSON.stringify({
      sessions,
      settings,
      usage,
      exportDate: new Date().toISOString(),
    }, null, 2);
  }

  async importData(jsonData: string): Promise<void> {
    const data = JSON.parse(jsonData);

    if (data.sessions) {
      for (const session of data.sessions) {
        await this.saveSession(session);
      }
    }

    if (data.settings) {
      await this.saveSettings(data.settings);
    }
  }
}

export const storage = new StorageManager();