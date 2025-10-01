// 🎯 LectureScript MVP - File Preview Component
// Shows uploaded file info with action buttons
// Author: Peter Levler

import React from 'react';
import type { AudioFile, PDFFile } from '../../types/upload';

interface FilePreviewProps {
  file: AudioFile | PDFFile;
  onRemove?: () => void;
  onRetry?: () => void;
}

export const FilePreview: React.FC<FilePreviewProps> = ({
  file,
  onRemove,
  onRetry,
}) => {
  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getIcon = () => {
    return file.type === 'audio' ? '🎵' : '📄';
  };

  const getStatusColor = () => {
    switch (file.status) {
      case 'completed':
        return '#10b981';
      case 'error':
        return '#ef4444';
      case 'uploading':
        return '#3b82f6';
      default:
        return '#6b7280';
    }
  };

  const getStatusIcon = () => {
    switch (file.status) {
      case 'completed':
        return '✓';
      case 'error':
        return '✕';
      case 'uploading':
        return '⟳';
      default:
        return '○';
    }
  };

  const getStatusText = () => {
    switch (file.status) {
      case 'completed':
        return 'Uploaded successfully';
      case 'error':
        return file.error || 'Upload failed';
      case 'uploading':
        return 'Uploading...';
      default:
        return 'Pending';
    }
  };

  return (
    <div
      style={{
        padding: '16px',
        backgroundColor: file.status === 'error' ? '#fef2f2' : '#f8fafc',
        borderRadius: '12px',
        border: `1px solid ${file.status === 'error' ? '#fecaca' : '#e5e7eb'}`,
        marginBottom: '12px',
      }}
    >
      {/* File Info */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
          <span style={{ fontSize: '32px' }}>{getIcon()}</span>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: '14px',
                fontWeight: '500',
                color: '#1f2937',
                marginBottom: '4px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {file.name}
            </div>

            <div
              style={{
                fontSize: '12px',
                color: '#6b7280',
                display: 'flex',
                gap: '12px',
                flexWrap: 'wrap',
              }}
            >
              <span>{formatSize(file.size)}</span>

              {file.type === 'audio' && (file as AudioFile).duration && (
                <span>• {formatDuration((file as AudioFile).duration)}</span>
              )}

              {file.type === 'pdf' && (file as PDFFile).pageCount && (
                <span>• {(file as PDFFile).pageCount} pages</span>
              )}

              <span>• {file.type === 'audio' ? (file as AudioFile).format : 'PDF'}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '8px', marginLeft: '12px' }}>
          {file.status === 'error' && onRetry && (
            <button
              onClick={onRetry}
              style={{
                padding: '4px 12px',
                fontSize: '12px',
                color: '#3b82f6',
                backgroundColor: 'transparent',
                border: '1px solid #dbeafe',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#dbeafe';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              Retry
            </button>
          )}

          {onRemove && file.status !== 'uploading' && (
            <button
              onClick={onRemove}
              style={{
                padding: '4px 12px',
                fontSize: '12px',
                color: '#ef4444',
                backgroundColor: 'transparent',
                border: '1px solid #fecaca',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#fee2e2';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              Remove
            </button>
          )}
        </div>
      </div>

      {/* Status */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '12px',
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            backgroundColor: getStatusColor(),
            color: 'white',
            fontSize: '10px',
            fontWeight: 'bold',
          }}
        >
          {getStatusIcon()}
        </span>
        <span style={{ color: getStatusColor(), fontWeight: '500' }}>
          {getStatusText()}
        </span>
      </div>
    </div>
  );
};

export default FilePreview;