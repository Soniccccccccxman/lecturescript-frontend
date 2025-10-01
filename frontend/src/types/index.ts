export interface TranscriptSegment {
  id: string;
  text: string;
  timestamp: number;
  confidence?: number;
  language?: 'zh' | 'en' | 'mixed';
  speaker?: string;
}

export interface LectureSession {
  id: string;
  name: string;
  startTime: number;
  endTime?: number;
  segments: TranscriptSegment[];
  summary?: string;
  language: 'zh' | 'en' | 'mixed';
  duration: number;
  wordCount: number;
  cost: number;
  status: 'recording' | 'processing' | 'completed' | 'error';
}

export interface AudioRecordingState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  stream: MediaStream | null;
  mediaRecorder: MediaRecorder | null;
  audioBlob: Blob | null;
  error: string | null;
}

export interface TranscriptionState {
  isTranscribing: boolean;
  currentSegment: string;
  segments: TranscriptSegment[];
  error: string | null;
  cost: number;
}

export interface UsageStats {
  totalMinutes: number;
  totalCost: number;
  sessionsCount: number;
  currentMonthUsage: number;
  currentMonthCost: number;
}

export interface ExportOptions {
  format: 'txt' | 'md' | 'docx' | 'notion' | 'gdocs';
  includeTimestamps: boolean;
  includeSummary: boolean;
  includeMetadata: boolean;
  language: 'zh' | 'en' | 'both';
}

export interface APISettings {
  openaiApiKey: string;
  model: 'whisper-1';
  language?: string;
  temperature?: number;
}

export interface AppSettings {
  autoSave: boolean;
  offlineMode: boolean;
  notifications: boolean;
  theme: 'light' | 'dark' | 'auto';
  defaultLanguage: 'zh' | 'en' | 'mixed';
  chunkDuration: number; // seconds for processing chunks
  apiSettings: APISettings;
}

export interface ErrorInfo {
  code: string;
  message: string;
  timestamp: number;
  context?: any;
}