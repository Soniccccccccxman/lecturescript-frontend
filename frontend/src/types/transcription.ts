// 🎯 LectureScript MVP - Transcription Types
// TypeScript definitions for transcription data structures
// Author: Peter Levler

/**
 * Word-level timing information
 */
export interface TranscriptionWord {
  word: string;
  start: number;
  end: number;
  confidence?: number;
}

/**
 * Transcription segment with timing and speaker info
 */
export interface TranscriptionSegment {
  id: string;
  text: string;
  start: number;
  end: number;
  speaker?: string;
  words?: TranscriptionWord[];
}

/**
 * Complete transcription result
 */
export interface Transcription {
  segments: TranscriptionSegment[];
  language: string;
  duration: number;
  text: string;
}

/**
 * PDF page to timestamp mapping
 */
export interface PageTimestamp {
  pageNumber: number;
  timestamp: number;
  segmentId: string;
}

/**
 * Export options
 */
export interface ExportOptions {
  format: 'html' | 'pdf' | 'text';
  includeTimestamps: boolean;
  includeSpeakers: boolean;
  includePageReferences: boolean;
}

export default TranscriptionSegment;