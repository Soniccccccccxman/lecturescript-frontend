// 🎯 LectureScript MVP - Upload Types
// Feature 1: File Upload System
// Author: Peter Levler

export type FileType = 'audio' | 'pdf';

export interface UploadFile {
  id: string;
  file: File;
  type: FileType;
  size: number;
  name: string;
  preview?: string;
  uploadProgress: number;
  status: 'pending' | 'uploading' | 'completed' | 'processing' | 'ready' | 'error';
  error?: string;
  transcriptId?: string;
  url?: string;
}

export interface AudioFile extends UploadFile {
  type: 'audio';
  duration?: number;
  format: string;
}

export interface PDFFile extends UploadFile {
  type: 'pdf';
  pageCount?: number;
}

export interface UploadResponse {
  success: boolean;
  fileId: string;
  fileUrl: string;
  metadata: {
    size: number;
    duration?: number;
    pageCount?: number;
    format: string;
  };
  transcriptId?: string;
  error?: string;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
  speed?: number; // bytes per second
  remainingTime?: number; // seconds
}

export interface UploadOptions {
  maxFileSize: number; // bytes
  allowedAudioFormats: string[];
  allowedPdfFormats: string[];
  chunkSize?: number;
  onProgress?: (progress: UploadProgress) => void;
  onComplete?: (response: UploadResponse) => void;
  onError?: (error: Error) => void;
}

export const UPLOAD_LIMITS = {
  MAX_AUDIO_SIZE: 25 * 1024 * 1024,  // 25MB (OpenAI Whisper API limit)
  MAX_PDF_SIZE: 50 * 1024 * 1024,    // 50MB (increased for large slide decks)
  ALLOWED_AUDIO_FORMATS: ['.mp3', '.wav', '.m4a', '.webm', '.ogg'],
  ALLOWED_PDF_FORMATS: ['.pdf'],
  CHUNK_SIZE: 5 * 1024 * 1024,       // 5MB chunks
};

export interface ValidationResult {
  valid: boolean;
  error?: string;
  warnings?: string[];
}

export interface UploadState {
  audioFile: AudioFile | null;
  pdfFile: PDFFile | null;
  isUploading: boolean;
  uploadProgress: {
    audio: number;
    pdf: number;
  };
  errors: {
    audio?: string;
    pdf?: string;
  };
}
