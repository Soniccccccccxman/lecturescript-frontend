// Recording Library Types

export interface RecordingEntry {
  id: string;
  title: string; // AI-generated or manually edited
  originalTitle?: string; // Original AI-generated title
  description?: string;
  transcript: string;
  keyTopics: string[];
  intelligentTitle: string;

  // Metadata
  dateCreated: number;
  duration: number; // in seconds
  wordCount: number;
  cost: number;

  // PDF Context
  pdfContext?: {
    contextId: string;
    title: string;
    summary: string;
    pageCount: number;
  };

  // Audio
  audioBlob?: Blob; // Optional, for playback
  hasAudio: boolean;

  // Tags and Organization
  tags: string[];
  isFavorited: boolean;
  isArchived: boolean;

  // Export History
  lastExported?: number;
  exportCount: number;
}

export interface LibraryFilters {
  search: string;
  dateRange: {
    start?: number;
    end?: number;
  };
  hasPdfContext?: boolean;
  hasAudio?: boolean;
  tags: string[];
  minDuration?: number;
  maxDuration?: number;
  sortBy: 'dateCreated' | 'duration' | 'title' | 'wordCount';
  sortOrder: 'asc' | 'desc';
  showArchived: boolean;
  showFavorites: boolean;
}

export interface LibraryStats {
  totalRecordings: number;
  totalDuration: number; // in seconds
  totalCost: number;
  averageDuration: number;
  recordingsWithPdf: number;
  recordingsWithAudio: number;
  totalWords: number;
  mostUsedTags: Array<{ tag: string; count: number }>;
}

export type ViewMode = 'live' | 'library';

export interface LibraryState {
  recordings: RecordingEntry[];
  filters: LibraryFilters;
  stats: LibraryStats;
  selectedRecording: RecordingEntry | null;
  isLoading: boolean;
  error: string | null;
}