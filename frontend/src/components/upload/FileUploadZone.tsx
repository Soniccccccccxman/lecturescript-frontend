// 🎯 LectureScript MVP - File Upload Zone Component
// Beautiful drag-and-drop upload interface
// Author: Peter Levler

import React, { useCallback, useState, useRef } from 'react';
import type { FileType } from '../../types/upload';
import { UploadProgress } from './UploadProgress';
import { FilePreview } from './FilePreview';
import { useFileUpload } from '../../hooks/useFileUpload';

interface FileUploadZoneProps {
  onUploadComplete?: (audioFile: any, pdfFile: any) => void;
}

export const FileUploadZone: React.FC<FileUploadZoneProps> = ({
  onUploadComplete,
}) => {
  const {
    audioFile,
    pdfFile,
    isUploading,
    uploadProgress,
    errors,
    processingStatus,
    uploadAudio,
    uploadPDF,
    validateAudioFile,
    validatePDFFile,
    cancelUpload,
    clearAudio,
    clearPDF,
    canUpload,
    isComplete,
  } = useFileUpload();

  const [isDragging, setIsDragging] = useState(false);
  const [dragType, setDragType] = useState<FileType | null>(null);

  const audioInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  // Handle drag events
  const handleDragEnter = useCallback((e: React.DragEvent, type: FileType) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    setDragType(type);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setDragType(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent, type: FileType) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      setDragType(null);

      if (!canUpload) return;

      const files = Array.from(e.dataTransfer.files);
      if (files.length === 0) return;

      const file = files[0];

      if (type === 'audio') {
        await uploadAudio(file);
      } else {
        await uploadPDF(file);
      }
    },
    [canUpload, uploadAudio, uploadPDF]
  );

  // Handle file input change
  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>, type: FileType) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      const file = files[0];

      if (type === 'audio') {
        await uploadAudio(file);
      } else {
        await uploadPDF(file);
      }

      // Reset input
      e.target.value = '';
    },
    [uploadAudio, uploadPDF]
  );

  // Trigger file input click
  const triggerFileInput = (type: FileType) => {
    if (!canUpload) return;

    if (type === 'audio' && audioInputRef.current) {
      audioInputRef.current.click();
    } else if (type === 'pdf' && pdfInputRef.current) {
      pdfInputRef.current.click();
    }
  };

  // Handle retry
  const handleRetry = (type: FileType) => {
    if (type === 'audio' && audioFile) {
      uploadAudio(audioFile.file);
    } else if (type === 'pdf' && pdfFile) {
      uploadPDF(pdfFile.file);
    }
  };

  // Notify parent when both files uploaded
  React.useEffect(() => {
    if (isComplete && onUploadComplete) {
      onUploadComplete(audioFile, pdfFile);
    }
  }, [isComplete, audioFile, pdfFile, onUploadComplete]);

  return (
    <div
      style={{
        maxWidth: '900px',
        margin: '0 auto',
        padding: '32px 24px',
      }}
    >
      {/* Header - Apple Minimalist */}
      <div style={{ textAlign: 'center', marginBottom: '64px' }}>
        <h1
          style={{
            fontSize: '28px',
            fontWeight: '700',
            color: '#1D1D1F',
            marginBottom: '12px',
            letterSpacing: '-0.02em',
            lineHeight: '1.1',
          }}
        >
          Transform Lectures Into Knowledge
        </h1>
        <p style={{
          fontSize: '17px',
          color: '#86868B',
          fontWeight: '400',
          letterSpacing: '0',
          lineHeight: '1.5',
        }}>
          Add audio. Get searchable transcript. Study smarter.
        </p>
      </div>

      {/* Upload Zones - Vertical Stack */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          marginBottom: '32px',
          maxWidth: '800px',
          margin: '0 auto 32px',
        }}
      >
        {/* Audio Upload Zone */}
        <div>
          <label
            style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: '500',
              color: '#86868B',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            Audio Recording
          </label>

          {!audioFile ? (
            <div
              onDragEnter={(e) => handleDragEnter(e, 'audio')}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, 'audio')}
              onClick={() => triggerFileInput('audio')}
              style={{
                border: `2px dashed ${
                  isDragging && dragType === 'audio' ? '#007AFF' : '#D1D1D6'
                }`,
                borderRadius: '16px',
                padding: '48px 24px',
                textAlign: 'center',
                cursor: canUpload ? 'pointer' : 'not-allowed',
                backgroundColor:
                  isDragging && dragType === 'audio' ? 'rgba(0, 122, 255, 0.05)' : '#FFFFFF',
                transition: 'all 0.2s',
                opacity: canUpload ? 1 : 0.6,
              }}
            >
              <div
                style={{
                  fontSize: '17px',
                  fontWeight: '600',
                  color: '#1D1D1F',
                  marginBottom: '8px',
                }}
              >
                Upload Audio Recording
              </div>
              <div style={{
                fontSize: '15px',
                color: '#86868B',
                lineHeight: '1.5',
              }}>
                Drag and drop or click to browse
              </div>
              <div
                style={{
                  fontSize: '13px',
                  color: '#86868B',
                  marginTop: '16px',
                }}
              >
                MP3, WAV, M4A, WebM · Max 25MB
              </div>

              <input
                ref={audioInputRef}
                type="file"
                accept=".mp3,.wav,.m4a,.webm,.ogg"
                onChange={(e) => handleFileChange(e, 'audio')}
                style={{ display: 'none' }}
                disabled={!canUpload}
              />
            </div>
          ) : audioFile.status === 'uploading' ? (
            <UploadProgress
              type="audio"
              fileName={audioFile.name}
              progress={uploadProgress.audio}
              onCancel={() => cancelUpload('audio')}
            />
          ) : (
            <FilePreview
              file={audioFile}
              onRemove={clearAudio}
              onRetry={() => handleRetry('audio')}
            />
          )}

          {errors.audio && (
            <div
              style={{
                marginTop: '8px',
                padding: '12px',
                backgroundColor: '#FFEBEE',
                color: '#C62828',
                fontSize: '13px',
                borderRadius: '8px',
                border: '1px solid #EF9A9A',
              }}
            >
              {errors.audio}
            </div>
          )}
        </div>

        {/* PDF Upload Zone */}
        <div>
          <label
            style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: '500',
              color: '#86868B',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            Lecture Notes (Optional)
          </label>

          {!pdfFile ? (
            <div
              onDragEnter={(e) => handleDragEnter(e, 'pdf')}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, 'pdf')}
              onClick={() => triggerFileInput('pdf')}
              style={{
                border: `2px dashed ${
                  isDragging && dragType === 'pdf' ? '#007AFF' : '#D1D1D6'
                }`,
                borderRadius: '16px',
                padding: '48px 24px',
                textAlign: 'center',
                cursor: canUpload ? 'pointer' : 'not-allowed',
                backgroundColor:
                  isDragging && dragType === 'pdf' ? 'rgba(0, 122, 255, 0.05)' : '#FFFFFF',
                transition: 'all 0.2s',
                opacity: canUpload ? 1 : 0.6,
              }}
            >
              <div
                style={{
                  fontSize: '17px',
                  fontWeight: '600',
                  color: '#1D1D1F',
                  marginBottom: '8px',
                }}
              >
                Upload Lecture Notes
              </div>
              <div style={{
                fontSize: '15px',
                color: '#86868B',
                lineHeight: '1.5',
              }}>
                Drag and drop or click to browse
              </div>
              <div
                style={{
                  fontSize: '13px',
                  color: '#86868B',
                  marginTop: '16px',
                }}
              >
                PDF · Max 50MB
              </div>

              <input
                ref={pdfInputRef}
                type="file"
                accept=".pdf"
                onChange={(e) => handleFileChange(e, 'pdf')}
                style={{ display: 'none' }}
                disabled={!canUpload}
              />
            </div>
          ) : pdfFile.status === 'uploading' ? (
            <UploadProgress
              type="pdf"
              fileName={pdfFile.name}
              progress={uploadProgress.pdf}
              onCancel={() => cancelUpload('pdf')}
            />
          ) : (
            <FilePreview
              file={pdfFile}
              onRemove={clearPDF}
              onRetry={() => handleRetry('pdf')}
            />
          )}

          {errors.pdf && (
            <div
              style={{
                marginTop: '8px',
                padding: '12px',
                backgroundColor: '#FFEBEE',
                color: '#C62828',
                fontSize: '13px',
                borderRadius: '8px',
                border: '1px solid #EF9A9A',
              }}
            >
              {errors.pdf}
            </div>
          )}
        </div>
      </div>

      {/* Processing Status Message */}
      {processingStatus && (
        <div
          style={{
            padding: '24px',
            backgroundColor: 'rgba(0, 122, 255, 0.05)',
            border: '1px solid rgba(0, 122, 255, 0.2)',
            borderRadius: '16px',
            textAlign: 'center',
            marginBottom: '24px',
          }}
        >
          <div
            style={{
              fontSize: '17px',
              fontWeight: '600',
              color: '#007AFF',
              marginBottom: '8px',
            }}
          >
            {processingStatus.includes('✅') ? 'Transcription Complete' : 'Transcribing Audio...'}
          </div>
          <div style={{
            fontSize: '15px',
            color: '#86868B',
            marginBottom: '12px',
            lineHeight: '1.6',
            whiteSpace: 'pre-line',
          }}>
            {processingStatus}
          </div>
          {!processingStatus.includes('✅') && (
            <>
              <div style={{
                width: '100%',
                height: '4px',
                backgroundColor: '#E5E5EA',
                borderRadius: '2px',
                overflow: 'hidden',
                marginTop: '16px',
                marginBottom: '12px',
              }}>
                <div style={{
                  height: '100%',
                  background: 'linear-gradient(90deg, #007AFF, #5AC8FA, #007AFF)',
                  backgroundSize: '200% 100%',
                  animation: 'pulse 2s ease-in-out infinite',
                  borderRadius: '2px',
                }} />
              </div>
              <div style={{
                fontSize: '13px',
                color: '#86868B',
                lineHeight: '1.6',
              }}>
                Large files may take 1-3 minutes to process.<br/>
                Keep this page open while we work.
              </div>
            </>
          )}
        </div>
      )}

      {/* Completion Message */}
      {isComplete && (
        <div
          style={{
            padding: '24px',
            backgroundColor: '#E8F5E9',
            border: '1px solid #81C784',
            borderRadius: '16px',
            textAlign: 'center',
            marginBottom: '24px',
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: '12px', color: '#34C759' }}>✓</div>
          <div
            style={{
              fontSize: '17px',
              fontWeight: '600',
              color: '#1D1D1F',
              marginBottom: '4px',
            }}
          >
            Ready to Study
          </div>
          <div style={{ fontSize: '15px', color: '#86868B' }}>
            Your lecture transcript is ready
          </div>
        </div>
      )}

      {/* Best Practices */}
      <div
        style={{
          padding: '24px',
          backgroundColor: '#F5F5F7',
          border: '1px solid #E5E5EA',
          borderRadius: '16px',
        }}
      >
        <div
          style={{
            fontSize: '13px',
            fontWeight: '500',
            color: '#86868B',
            marginBottom: '12px',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          Best Practices
        </div>
        <ul
          style={{
            fontSize: '13px',
            color: '#86868B',
            margin: 0,
            paddingLeft: '20px',
            lineHeight: '1.6',
          }}
        >
          <li>Use clear recordings with minimal background noise</li>
          <li>Add PDF notes for better context matching</li>
          <li>Audio files must be under 25MB</li>
          <li>PDF files must be under 50MB</li>
        </ul>
      </div>
    </div>
  );
};

export default FileUploadZone;
