// 🎯 LectureScript MVP - Upload Progress Component
// Beautiful progress indicator with speed and ETA
// Author: Peter Levler

import React from 'react';
import type { FileType } from '../../types/upload';

interface UploadProgressProps {
  type: FileType;
  fileName: string;
  progress: number;
  speed?: number;
  remainingTime?: number;
  onCancel?: () => void;
}

export const UploadProgress: React.FC<UploadProgressProps> = ({
  type,
  fileName,
  progress,
  speed,
  remainingTime,
  onCancel,
}) => {
  const formatSpeed = (bytesPerSecond: number): string => {
    const mbps = bytesPerSecond / (1024 * 1024);
    if (mbps < 1) {
      return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`;
    }
    return `${mbps.toFixed(1)} MB/s`;
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 60) {
      return `${Math.round(seconds)}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${minutes}m ${secs}s`;
  };

  const getIcon = () => {
    return type === 'audio' ? '🎵' : '📄';
  };

  const getColor = () => {
    if (progress < 30) return '#3b82f6'; // blue
    if (progress < 70) return '#8b5cf6'; // purple
    return '#10b981'; // green
  };

  return (
    <div
      style={{
        padding: '16px',
        backgroundColor: '#f8fafc',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        marginBottom: '12px',
      }}
    >
      {/* File Info */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '24px' }}>{getIcon()}</span>
          <div>
            <div
              style={{
                fontSize: '14px',
                fontWeight: '500',
                color: '#1f2937',
                marginBottom: '2px',
              }}
            >
              {fileName}
            </div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>
              Uploading {type}...
            </div>
          </div>
        </div>

        {onCancel && (
          <button
            onClick={onCancel}
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
            Cancel
          </button>
        )}
      </div>

      {/* Progress Bar */}
      <div
        style={{
          width: '100%',
          height: '8px',
          backgroundColor: '#e5e7eb',
          borderRadius: '4px',
          overflow: 'hidden',
          marginBottom: '8px',
        }}
      >
        <div
          style={{
            width: `${progress}%`,
            height: '100%',
            backgroundColor: getColor(),
            transition: 'width 0.3s ease, background-color 0.3s ease',
            borderRadius: '4px',
          }}
        />
      </div>

      {/* Stats */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '12px',
          color: '#6b7280',
        }}
      >
        <span style={{ fontWeight: '500', color: '#1f2937' }}>
          {progress}%
        </span>

        <div style={{ display: 'flex', gap: '16px' }}>
          {speed && speed > 0 && (
            <span>{formatSpeed(speed)}</span>
          )}
          {remainingTime && remainingTime > 0 && remainingTime < 3600 && (
            <span>ETA: {formatTime(remainingTime)}</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default UploadProgress;