// 🎯 LectureScript MVP - Upload Service
// Handles file uploads with progress tracking, validation, and error handling
// Author: Peter Levler

import type {
  UploadFile,
  AudioFile,
  PDFFile,
  UploadResponse,
  UploadProgress,
  ValidationResult,
} from '../types/upload';
import { UPLOAD_LIMITS } from '../types/upload';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

class UploadService {
  private abortControllers: Map<string, AbortController> = new Map();

  /**
   * Validate file before upload
   */
  validateFile(file: File, type: 'audio' | 'pdf'): ValidationResult {
    const limits = type === 'audio'
      ? { maxSize: UPLOAD_LIMITS.MAX_AUDIO_SIZE, formats: UPLOAD_LIMITS.ALLOWED_AUDIO_FORMATS }
      : { maxSize: UPLOAD_LIMITS.MAX_PDF_SIZE, formats: UPLOAD_LIMITS.ALLOWED_PDF_FORMATS };

    // Check file size
    if (file.size > limits.maxSize) {
      return {
        valid: false,
        error: `File size must be under ${this.formatBytes(limits.maxSize)}. Current: ${this.formatBytes(file.size)}`,
      };
    }

    if (file.size === 0) {
      return {
        valid: false,
        error: 'File is empty. Please select a valid file.',
      };
    }

    // Check file format
    const extension = this.getFileExtension(file.name);
    if (!limits.formats.includes(extension)) {
      return {
        valid: false,
        error: `Invalid file format. Allowed: ${limits.formats.join(', ')}`,
      };
    }

    // Warnings for large files
    const warnings: string[] = [];
    if (type === 'audio' && file.size > 50 * 1024 * 1024) {
      warnings.push('Large file detected. Upload may take several minutes.');
    }

    return {
      valid: true,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Upload audio file with progress tracking
   */
  async uploadAudio(
    file: File,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResponse> {
    const fileId = this.generateFileId();
    const abortController = new AbortController();
    this.abortControllers.set(fileId, abortController);

    try {
      // Validate first
      const validation = this.validateFile(file, 'audio');
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Create form data
      const formData = new FormData();
      formData.append('audio', file);
      formData.append('fileId', fileId);
      formData.append('originalName', file.name);

      // Track upload progress
      const startTime = Date.now();
      let lastLoaded = 0;
      let lastTime = startTime;

      const response = await this.uploadWithProgress(
        `${BACKEND_URL}/api/upload/audio`,
        formData,
        (loaded, total) => {
          const now = Date.now();
          const timeElapsed = (now - lastTime) / 1000; // seconds
          const bytesUploaded = loaded - lastLoaded;
          const speed = timeElapsed > 0 ? bytesUploaded / timeElapsed : 0;
          const remainingBytes = total - loaded;
          const remainingTime = speed > 0 ? remainingBytes / speed : 0;

          lastLoaded = loaded;
          lastTime = now;

          if (onProgress) {
            onProgress({
              loaded,
              total,
              percentage: Math.round((loaded / total) * 100),
              speed,
              remainingTime,
            });
          }
        },
        abortController.signal
      );

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Upload failed');
      }

      return {
        success: true,
        fileId: result.fileId,
        fileUrl: result.fileUrl,
        metadata: {
          size: file.size,
          duration: result.duration,
          format: this.getFileExtension(file.name),
        },
        transcriptId: result.transcriptId,
      };
    } catch (error) {
      console.error('Audio upload error:', error);
      throw this.handleUploadError(error);
    } finally {
      this.abortControllers.delete(fileId);
    }
  }

  /**
   * Upload PDF file with progress tracking
   */
  async uploadPDF(
    file: File,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResponse> {
    const fileId = this.generateFileId();
    const abortController = new AbortController();
    this.abortControllers.set(fileId, abortController);

    try {
      // Validate first
      const validation = this.validateFile(file, 'pdf');
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Create form data
      const formData = new FormData();
      formData.append('pdf', file);
      formData.append('fileId', fileId);
      formData.append('originalName', file.name);

      // Track upload progress
      const response = await this.uploadWithProgress(
        `${BACKEND_URL}/api/upload/pdf`,
        formData,
        (loaded, total) => {
          if (onProgress) {
            onProgress({
              loaded,
              total,
              percentage: Math.round((loaded / total) * 100),
            });
          }
        },
        abortController.signal
      );

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'PDF upload failed');
      }

      return {
        success: true,
        fileId: result.fileId,
        fileUrl: result.fileUrl,
        metadata: {
          size: file.size,
          pageCount: result.pageCount,
          format: '.pdf',
        },
      };
    } catch (error) {
      console.error('PDF upload error:', error);
      throw this.handleUploadError(error);
    } finally {
      this.abortControllers.delete(fileId);
    }
  }

  /**
   * Upload with XMLHttpRequest for progress tracking
   */
  private uploadWithProgress(
    url: string,
    formData: FormData,
    onProgress: (loaded: number, total: number) => void,
    signal: AbortSignal
  ): Promise<Response> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // Handle abort
      signal.addEventListener('abort', () => {
        xhr.abort();
        reject(new Error('Upload cancelled'));
      });

      // Track progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          onProgress(event.loaded, event.total);
        }
      });

      // Handle completion
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const response = new Response(xhr.responseText, {
            status: xhr.status,
            statusText: xhr.statusText,
            headers: this.parseResponseHeaders(xhr.getAllResponseHeaders()),
          });
          resolve(response);
        } else {
          reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
        }
      });

      // Handle errors
      xhr.addEventListener('error', () => {
        reject(new Error('Network error during upload'));
      });

      xhr.addEventListener('timeout', () => {
        reject(new Error('Upload timeout'));
      });

      // Send request
      xhr.open('POST', url);
      xhr.timeout = 300000; // 5 minutes timeout
      xhr.send(formData);
    });
  }

  /**
   * Cancel upload by file ID
   */
  cancelUpload(fileId: string): void {
    const controller = this.abortControllers.get(fileId);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(fileId);
    }
  }

  /**
   * Cancel all active uploads
   */
  cancelAllUploads(): void {
    this.abortControllers.forEach((controller) => controller.abort());
    this.abortControllers.clear();
  }

  /**
   * Get file extension with dot
   */
  private getFileExtension(filename: string): string {
    const ext = filename.toLowerCase().match(/\.[^.]+$/);
    return ext ? ext[0] : '';
  }

  /**
   * Format bytes to human-readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Generate unique file ID
   */
  private generateFileId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Parse XHR response headers
   */
  private parseResponseHeaders(headerStr: string): Headers {
    const headers = new Headers();
    if (!headerStr) return headers;

    const headerPairs = headerStr.split('\r\n');
    for (const headerPair of headerPairs) {
      const index = headerPair.indexOf(': ');
      if (index > 0) {
        const key = headerPair.substring(0, index);
        const value = headerPair.substring(index + 2);
        headers.set(key, value);
      }
    }
    return headers;
  }

  /**
   * Handle upload errors with user-friendly messages
   */
  private handleUploadError(error: any): Error {
    if (error.name === 'AbortError') {
      return new Error('Upload cancelled');
    }

    if (error.message?.includes('Network')) {
      return new Error('Network error. Please check your internet connection and try again.');
    }

    if (error.message?.includes('timeout')) {
      return new Error('Upload timeout. Please try again or use a smaller file.');
    }

    if (error.message?.includes('413')) {
      return new Error('File too large for server. Please use a smaller file.');
    }

    if (error.message?.includes('415')) {
      return new Error('File format not supported by server.');
    }

    if (error.message?.includes('500') || error.message?.includes('502') || error.message?.includes('503')) {
      return new Error('Server error. Please try again in a few moments.');
    }

    // Return original error if not recognized
    return error instanceof Error ? error : new Error('Upload failed. Please try again.');
  }

  /**
   * Check if backend is available
   */
  async checkBackendHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${BACKEND_URL}/api/health`, {
        method: 'GET',
        timeout: 5000,
      } as any);
      const result = await response.json();
      return result.success && result.status === 'healthy';
    } catch (error) {
      console.error('Backend health check failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const uploadService = new UploadService();
export default uploadService;