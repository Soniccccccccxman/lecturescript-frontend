import { openDB, type IDBPDatabase } from 'idb';
import type { RecordingEntry, LibraryFilters, LibraryStats } from '../types/library';

const DB_NAME = 'LectureLibraryDB';
const DB_VERSION = 1;

class LibraryStorageManager {
  private db: IDBPDatabase | null = null;

  async initialize(): Promise<void> {
    if (this.db) return;

    this.db = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Recordings store
        if (!db.objectStoreNames.contains('recordings')) {
          const recordingStore = db.createObjectStore('recordings', { keyPath: 'id' });
          recordingStore.createIndex('dateCreated', 'dateCreated');
          recordingStore.createIndex('title', 'title');
          recordingStore.createIndex('duration', 'duration');
          recordingStore.createIndex('wordCount', 'wordCount');
          recordingStore.createIndex('tags', 'tags', { multiEntry: true });
          recordingStore.createIndex('hasPdfContext', 'pdfContext', { unique: false });
          recordingStore.createIndex('hasAudio', 'hasAudio');
          recordingStore.createIndex('isFavorited', 'isFavorited');
          recordingStore.createIndex('isArchived', 'isArchived');
        }

        // Library stats store
        if (!db.objectStoreNames.contains('libraryStats')) {
          db.createObjectStore('libraryStats', { keyPath: 'id' });
        }

        // Audio blobs store for recordings
        if (!db.objectStoreNames.contains('recordingAudio')) {
          db.createObjectStore('recordingAudio', { keyPath: 'recordingId' });
        }
      },
    });
  }

  // Recording CRUD operations
  async saveRecording(recording: RecordingEntry): Promise<void> {
    if (!this.db) await this.initialize();

    // Separate audio blob from main record for storage efficiency
    const { audioBlob, ...recordingData } = recording;

    const tx = this.db!.transaction(['recordings', 'recordingAudio'], 'readwrite');

    await tx.objectStore('recordings').put(recordingData);

    if (audioBlob) {
      await tx.objectStore('recordingAudio').put({
        recordingId: recording.id,
        audioBlob,
        timestamp: Date.now()
      });
    }

    await this.updateLibraryStats();
  }

  async getRecording(id: string): Promise<RecordingEntry | undefined> {
    if (!this.db) await this.initialize();

    const tx = this.db!.transaction(['recordings', 'recordingAudio'], 'readonly');

    const recording = await tx.objectStore('recordings').get(id);
    if (!recording) return undefined;

    const audioData = await tx.objectStore('recordingAudio').get(id);

    return {
      ...recording,
      audioBlob: audioData?.audioBlob
    };
  }

  async getAllRecordings(): Promise<RecordingEntry[]> {
    if (!this.db) await this.initialize();

    const recordings = await this.db!.getAll('recordings');

    // Load audio blobs for recordings that have them
    const recordingsWithAudio = await Promise.all(
      recordings.map(async (recording) => {
        if (recording.hasAudio) {
          const audioData = await this.db!.get('recordingAudio', recording.id);
          return {
            ...recording,
            audioBlob: audioData?.audioBlob
          };
        }
        return recording;
      })
    );

    return recordingsWithAudio;
  }

  async getFilteredRecordings(filters: LibraryFilters): Promise<RecordingEntry[]> {
    if (!this.db) await this.initialize();

    let recordings = await this.getAllRecordings();

    // Apply filters
    recordings = recordings.filter(recording => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matches =
          recording.title.toLowerCase().includes(searchLower) ||
          recording.transcript.toLowerCase().includes(searchLower) ||
          recording.keyTopics.some(topic => topic.toLowerCase().includes(searchLower)) ||
          recording.tags.some(tag => tag.toLowerCase().includes(searchLower));

        if (!matches) return false;
      }

      // Date range filter
      if (filters.dateRange.start && recording.dateCreated < filters.dateRange.start) {
        return false;
      }
      if (filters.dateRange.end && recording.dateCreated > filters.dateRange.end) {
        return false;
      }

      // PDF context filter
      if (filters.hasPdfContext !== undefined) {
        if (filters.hasPdfContext && !recording.pdfContext) return false;
        if (!filters.hasPdfContext && recording.pdfContext) return false;
      }

      // Audio filter
      if (filters.hasAudio !== undefined) {
        if (filters.hasAudio && !recording.hasAudio) return false;
        if (!filters.hasAudio && recording.hasAudio) return false;
      }

      // Duration filters
      if (filters.minDuration !== undefined && recording.duration < filters.minDuration) {
        return false;
      }
      if (filters.maxDuration !== undefined && recording.duration > filters.maxDuration) {
        return false;
      }

      // Tags filter
      if (filters.tags.length > 0) {
        const hasMatchingTag = filters.tags.some(tag => recording.tags.includes(tag));
        if (!hasMatchingTag) return false;
      }

      // Archive filter
      if (!filters.showArchived && recording.isArchived) {
        return false;
      }

      // Favorites filter
      if (filters.showFavorites && !recording.isFavorited) {
        return false;
      }

      return true;
    });

    // Apply sorting
    recordings.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (filters.sortBy) {
        case 'dateCreated':
          aValue = a.dateCreated;
          bValue = b.dateCreated;
          break;
        case 'duration':
          aValue = a.duration;
          bValue = b.duration;
          break;
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'wordCount':
          aValue = a.wordCount;
          bValue = b.wordCount;
          break;
        default:
          aValue = a.dateCreated;
          bValue = b.dateCreated;
      }

      if (filters.sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return recordings;
  }

  async updateRecording(id: string, updates: Partial<RecordingEntry>): Promise<void> {
    if (!this.db) await this.initialize();

    const existing = await this.getRecording(id);
    if (!existing) throw new Error('Recording not found');

    const updated = { ...existing, ...updates };
    await this.saveRecording(updated);
  }

  async deleteRecording(id: string): Promise<void> {
    if (!this.db) await this.initialize();

    const tx = this.db!.transaction(['recordings', 'recordingAudio'], 'readwrite');

    await Promise.all([
      tx.objectStore('recordings').delete(id),
      tx.objectStore('recordingAudio').delete(id)
    ]);

    await this.updateLibraryStats();
  }

  async toggleFavorite(id: string): Promise<void> {
    const recording = await this.getRecording(id);
    if (recording) {
      await this.updateRecording(id, { isFavorited: !recording.isFavorited });
    }
  }

  async toggleArchive(id: string): Promise<void> {
    const recording = await this.getRecording(id);
    if (recording) {
      await this.updateRecording(id, { isArchived: !recording.isArchived });
    }
  }

  async addTag(id: string, tag: string): Promise<void> {
    const recording = await this.getRecording(id);
    if (recording && !recording.tags.includes(tag)) {
      await this.updateRecording(id, {
        tags: [...recording.tags, tag]
      });
    }
  }

  async removeTag(id: string, tag: string): Promise<void> {
    const recording = await this.getRecording(id);
    if (recording) {
      await this.updateRecording(id, {
        tags: recording.tags.filter(t => t !== tag)
      });
    }
  }

  // Stats and analytics
  async updateLibraryStats(): Promise<void> {
    if (!this.db) await this.initialize();

    const recordings = await this.getAllRecordings();

    const stats: LibraryStats = {
      totalRecordings: recordings.length,
      totalDuration: recordings.reduce((sum, r) => sum + r.duration, 0),
      totalCost: recordings.reduce((sum, r) => sum + r.cost, 0),
      averageDuration: recordings.length > 0
        ? recordings.reduce((sum, r) => sum + r.duration, 0) / recordings.length
        : 0,
      recordingsWithPdf: recordings.filter(r => r.pdfContext).length,
      recordingsWithAudio: recordings.filter(r => r.hasAudio).length,
      totalWords: recordings.reduce((sum, r) => sum + r.wordCount, 0),
      mostUsedTags: this.calculateTagFrequency(recordings)
    };

    await this.db!.put('libraryStats', { id: 'current', ...stats });
  }

  async getLibraryStats(): Promise<LibraryStats> {
    if (!this.db) await this.initialize();

    const stats = await this.db!.get('libraryStats', 'current');

    if (!stats) {
      await this.updateLibraryStats();
      return await this.getLibraryStats();
    }

    return {
      totalRecordings: stats.totalRecordings,
      totalDuration: stats.totalDuration,
      totalCost: stats.totalCost,
      averageDuration: stats.averageDuration,
      recordingsWithPdf: stats.recordingsWithPdf,
      recordingsWithAudio: stats.recordingsWithAudio,
      totalWords: stats.totalWords,
      mostUsedTags: stats.mostUsedTags
    };
  }

  private calculateTagFrequency(recordings: RecordingEntry[]): Array<{ tag: string; count: number }> {
    const tagCounts: Record<string, number> = {};

    recordings.forEach(recording => {
      recording.tags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });

    return Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 tags
  }

  // Utility methods
  async getAllTags(): Promise<string[]> {
    const recordings = await this.getAllRecordings();
    const allTags = recordings.flatMap(r => r.tags);
    return Array.from(new Set(allTags)).sort();
  }

  async searchRecordings(query: string, limit: number = 20): Promise<RecordingEntry[]> {
    const recordings = await this.getAllRecordings();
    const queryLower = query.toLowerCase();

    return recordings
      .filter(recording =>
        recording.title.toLowerCase().includes(queryLower) ||
        recording.transcript.toLowerCase().includes(queryLower) ||
        recording.keyTopics.some(topic => topic.toLowerCase().includes(queryLower))
      )
      .slice(0, limit);
  }

  async exportLibraryData(): Promise<string> {
    const recordings = await this.getAllRecordings();
    const stats = await this.getLibraryStats();

    // Remove audio blobs for export (too large)
    const recordingsForExport = recordings.map(({ audioBlob, ...recording }) => recording);

    return JSON.stringify({
      recordings: recordingsForExport,
      stats,
      exportDate: new Date().toISOString(),
      version: '1.0'
    }, null, 2);
  }

  async importLibraryData(jsonData: string): Promise<void> {
    const data = JSON.parse(jsonData);

    if (data.recordings && Array.isArray(data.recordings)) {
      for (const recording of data.recordings) {
        // Ensure required fields exist
        const recordingEntry: RecordingEntry = {
          hasAudio: false,
          tags: [],
          isFavorited: false,
          isArchived: false,
          exportCount: 0,
          ...recording
        };

        await this.saveRecording(recordingEntry);
      }
    }
  }

  async clearAllData(): Promise<void> {
    if (!this.db) await this.initialize();

    const tx = this.db!.transaction(['recordings', 'libraryStats', 'recordingAudio'], 'readwrite');

    await Promise.all([
      tx.objectStore('recordings').clear(),
      tx.objectStore('libraryStats').clear(),
      tx.objectStore('recordingAudio').clear()
    ]);
  }

  // Helper to create a new recording entry
  createRecordingEntry(
    transcript: string,
    intelligentTitle: string,
    keyTopics: string[],
    duration: number,
    cost: number,
    pdfContext?: RecordingEntry['pdfContext'],
    audioBlob?: Blob
  ): RecordingEntry {
    const id = `recording_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const wordCount = transcript.split(/\s+/).length;

    return {
      id,
      title: intelligentTitle || 'Untitled Recording',
      originalTitle: intelligentTitle,
      transcript,
      keyTopics,
      intelligentTitle,
      dateCreated: Date.now(),
      duration,
      wordCount,
      cost,
      pdfContext,
      audioBlob,
      hasAudio: !!audioBlob,
      tags: [],
      isFavorited: false,
      isArchived: false,
      exportCount: 0
    };
  }
}

export const libraryStorage = new LibraryStorageManager();