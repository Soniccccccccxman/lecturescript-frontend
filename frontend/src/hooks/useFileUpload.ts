// 🎯 LectureScript MVP - File Upload Hook
// Manages upload state and provides easy-to-use interface
// Author: Peter Levler

import { useState, useCallback, useRef } from 'react';
import type {
  AudioFile,
  PDFFile,
  UploadProgress,
  UploadResponse,
  ValidationResult,
} from '../types/upload';
import { uploadService } from '../services/uploadService';
import { transcriptionService } from '../services/transcriptionService';

interface UseFileUploadReturn {
  // State
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
  processingStatus: string;

  // Actions
  uploadAudio: (file: File) => Promise<void>;
  uploadPDF: (file: File) => Promise<void>;
  validateAudioFile: (file: File) => ValidationResult;
  validatePDFFile: (file: File) => ValidationResult;
  cancelUpload: (type: 'audio' | 'pdf') => void;
  clearAudio: () => void;
  clearPDF: () => void;
  clearAll: () => void;

  // Status
  canUpload: boolean;
  isComplete: boolean;
}

export const useFileUpload = (): UseFileUploadReturn => {
  const [audioFile, setAudioFile] = useState<AudioFile | null>(null);
  const [pdfFile, setPDFFile] = useState<PDFFile | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({
    audio: 0,
    pdf: 0,
  });
  const [errors, setErrors] = useState<{
    audio?: string;
    pdf?: string;
  }>({});
  const [processingStatus, setProcessingStatus] = useState<string>('');

  const audioFileIdRef = useRef<string>('');
  const pdfFileIdRef = useRef<string>('');

  /**
   * Validate audio file
   */
  const validateAudioFile = useCallback((file: File): ValidationResult => {
    return uploadService.validateFile(file, 'audio');
  }, []);

  /**
   * Validate PDF file
   */
  const validatePDFFile = useCallback((file: File): ValidationResult => {
    return uploadService.validateFile(file, 'pdf');
  }, []);

  /**
   * Upload audio file
   */
  const uploadAudio = useCallback(async (file: File): Promise<void> => {
    try {
      // Clear previous errors
      setErrors(prev => ({ ...prev, audio: undefined }));

      // Validate file
      const validation = validateAudioFile(file);
      if (!validation.valid) {
        setErrors(prev => ({ ...prev, audio: validation.error }));
        return;
      }

      // Create file object
      const fileId = `audio-${Date.now()}`;
      audioFileIdRef.current = fileId;

      const audioFileObj: AudioFile = {
        id: fileId,
        file,
        type: 'audio',
        size: file.size,
        name: file.name,
        format: file.name.split('.').pop()?.toLowerCase() || '',
        uploadProgress: 0,
        status: 'uploading',
      };

      setAudioFile(audioFileObj);
      setIsUploading(true);
      setUploadProgress(prev => ({ ...prev, audio: 0 }));

      // Upload with progress tracking
      const response = await uploadService.uploadAudio(
        file,
        (progress: UploadProgress) => {
          setUploadProgress(prev => ({
            ...prev,
            audio: progress.percentage,
          }));

          setAudioFile(prev => prev ? {
            ...prev,
            uploadProgress: progress.percentage,
          } : null);
        }
      );

      // Update file object with response - now in processing state
      setAudioFile(prev => prev ? {
        ...prev,
        status: 'processing',
        uploadProgress: 100,
        duration: response.metadata.duration,
        transcriptId: response.transcriptId,
      } : null);

      console.log('✅ Audio upload completed:', response);

      // Start polling for transcription status
      if (response.transcriptId) {
        setProcessingStatus('🎵 Starting AI transcription...');

        try {
          const transcriptionResult = await transcriptionService.pollTranscriptionStatus(
            response.transcriptId,
            (status, attempt, maxAttempts) => {
              setProcessingStatus(status);
            }
          );

          if (transcriptionResult.status === 'completed') {
            setAudioFile(prev => prev ? {
              ...prev,
              status: 'ready',
            } : null);
            setProcessingStatus('✅ Transcription complete!');
            console.log('🎉 Transcription ready:', transcriptionResult);
          } else if (transcriptionResult.status === 'error') {
            throw new Error(transcriptionResult.error || 'Transcription failed');
          }
        } catch (transcriptionError) {
          const errorMsg = transcriptionError instanceof Error
            ? transcriptionError.message
            : 'Transcription processing failed';
          setErrors(prev => ({ ...prev, audio: errorMsg }));
          setAudioFile(prev => prev ? {
            ...prev,
            status: 'error',
            error: errorMsg,
          } : null);
          setProcessingStatus('');
          console.error('❌ Transcription error:', transcriptionError);
        }
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Audio upload failed';
      setErrors(prev => ({ ...prev, audio: errorMessage }));
      setAudioFile(prev => prev ? {
        ...prev,
        status: 'error',
        error: errorMessage,
      } : null);
      console.error('❌ Audio upload error:', error);
    } finally {
      setIsUploading(false);
    }
  }, [validateAudioFile]);

  /**
   * Upload PDF file
   */
  const uploadPDF = useCallback(async (file: File): Promise<void> => {
    try {
      // Clear previous errors
      setErrors(prev => ({ ...prev, pdf: undefined }));

      // Validate file
      const validation = validatePDFFile(file);
      if (!validation.valid) {
        setErrors(prev => ({ ...prev, pdf: validation.error }));
        return;
      }

      // Create file object
      const fileId = `pdf-${Date.now()}`;
      pdfFileIdRef.current = fileId;

      const pdfFileObj: PDFFile = {
        id: fileId,
        file,
        type: 'pdf',
        size: file.size,
        name: file.name,
        uploadProgress: 0,
        status: 'uploading',
      };

      setPDFFile(pdfFileObj);
      setIsUploading(true);
      setUploadProgress(prev => ({ ...prev, pdf: 0 }));

      // Upload with progress tracking
      const response = await uploadService.uploadPDF(
        file,
        (progress: UploadProgress) => {
          setUploadProgress(prev => ({
            ...prev,
            pdf: progress.percentage,
          }));

          setPDFFile(prev => prev ? {
            ...prev,
            uploadProgress: progress.percentage,
          } : null);
        }
      );

      // Update file object with response
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
      const fullPdfUrl = `${backendUrl}${response.fileUrl}`;

      setPDFFile(prev => prev ? {
        ...prev,
        status: 'completed',
        uploadProgress: 100,
        pageCount: response.metadata.pageCount,
        url: fullPdfUrl,
      } : null);

      console.log('✅ PDF upload completed:', response);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'PDF upload failed';
      setErrors(prev => ({ ...prev, pdf: errorMessage }));
      setPDFFile(prev => prev ? {
        ...prev,
        status: 'error',
        error: errorMessage,
      } : null);
      console.error('❌ PDF upload error:', error);
    } finally {
      setIsUploading(false);
    }
  }, [validatePDFFile]);

  /**
   * Cancel upload by type
   */
  const cancelUpload = useCallback((type: 'audio' | 'pdf') => {
    const fileId = type === 'audio' ? audioFileIdRef.current : pdfFileIdRef.current;
    if (fileId) {
      uploadService.cancelUpload(fileId);

      if (type === 'audio') {
        setAudioFile(prev => prev ? {
          ...prev,
          status: 'error',
          error: 'Upload cancelled',
        } : null);
      } else {
        setPDFFile(prev => prev ? {
          ...prev,
          status: 'error',
          error: 'Upload cancelled',
        } : null);
      }
    }
  }, []);

  /**
   * Clear audio file
   */
  const clearAudio = useCallback(() => {
    if (audioFile?.status === 'uploading') {
      cancelUpload('audio');
    }
    setAudioFile(null);
    setUploadProgress(prev => ({ ...prev, audio: 0 }));
    setErrors(prev => ({ ...prev, audio: undefined }));
  }, [audioFile, cancelUpload]);

  /**
   * Clear PDF file
   */
  const clearPDF = useCallback(() => {
    if (pdfFile?.status === 'uploading') {
      cancelUpload('pdf');
    }
    setPDFFile(null);
    setUploadProgress(prev => ({ ...prev, pdf: 0 }));
    setErrors(prev => ({ ...prev, pdf: undefined }));
  }, [pdfFile, cancelUpload]);

  /**
   * Clear all files
   */
  const clearAll = useCallback(() => {
    clearAudio();
    clearPDF();
  }, [clearAudio, clearPDF]);

  /**
   * Check if can upload
   * Allow PDF upload even when audio is processing (not uploading)
   */
  const canUpload = !isUploading || audioFile?.status === 'processing';

  /**
   * Check if upload is complete and ready to proceed
   * Audio must finish uploading (status='processing') and PDF must be uploaded or null
   */
  const isComplete =
    (audioFile?.status === 'processing' || audioFile?.status === 'ready') &&
    (pdfFile?.status === 'completed' || pdfFile === null);

  return {
    // State
    audioFile,
    pdfFile,
    isUploading,
    uploadProgress,
    errors,
    processingStatus,

    // Actions
    uploadAudio,
    uploadPDF,
    validateAudioFile,
    validatePDFFile,
    cancelUpload,
    clearAudio,
    clearPDF,
    clearAll,

    // Status
    canUpload,
    isComplete,
  };
};

export default useFileUpload;