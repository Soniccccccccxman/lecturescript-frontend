// 🎯 LectureScript MVP - Export Button Component
// Smart HTML export with offline support
// Author: Peter Levler

import React, { useState } from 'react';
import type { TranscriptionSegment } from '../../types/transcription';
import type { AudioFile } from '../../types/upload';
import { exportService } from '../../services/studyModeExportService';

interface ExportButtonProps {
  transcription: TranscriptionSegment[];
  audioFile: AudioFile | null;
}

export const ExportButton: React.FC<ExportButtonProps> = ({
  transcription,
  audioFile,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  /**
   * Handle HTML export
   */
  const handleExportHTML = async () => {
    try {
      setIsExporting(true);
      setShowMenu(false);

      console.log('📤 Exporting HTML...');

      const filename = audioFile?.name
        ? audioFile.name.replace(/\.[^/.]+$/, '') + '_transcript.html'
        : 'lecture_transcript.html';

      await exportService.exportHTML(transcription, filename, {
        title: audioFile?.name || 'Lecture Transcript',
        includeTimestamps: true,
        includeSpeakers: true,
      });

      console.log('✅ HTML export completed');
    } catch (error) {
      console.error('❌ Export error:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  /**
   * Handle plain text export
   */
  const handleExportText = async () => {
    try {
      setIsExporting(true);
      setShowMenu(false);

      console.log('📤 Exporting text...');

      const filename = audioFile?.name
        ? audioFile.name.replace(/\.[^/.]+$/, '') + '_transcript.txt'
        : 'lecture_transcript.txt';

      await exportService.exportText(transcription, filename, {
        includeTimestamps: true,
        includeSpeakers: true,
      });

      console.log('✅ Text export completed');
    } catch (error) {
      console.error('❌ Export error:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  /**
   * Handle copy to clipboard
   */
  const handleCopyToClipboard = async () => {
    try {
      setShowMenu(false);

      const text = exportService.generatePlainText(transcription, {
        includeTimestamps: true,
        includeSpeakers: true,
      });

      await navigator.clipboard.writeText(text);

      // Show success feedback
      alert('✅ Transcript copied to clipboard!');

      console.log('✅ Copied to clipboard');
    } catch (error) {
      console.error('❌ Copy error:', error);
      alert('Failed to copy. Please try again.');
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Export Button */}
      <button
        onClick={() => setShowMenu(!showMenu)}
        disabled={isExporting || transcription.length === 0}
        style={{
          padding: '8px 16px',
          fontSize: '14px',
          fontWeight: '500',
          color: 'white',
          backgroundColor: isExporting ? '#9ca3af' : '#10b981',
          border: 'none',
          borderRadius: '8px',
          cursor: isExporting || transcription.length === 0 ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          transition: 'all 0.2s',
          opacity: transcription.length === 0 ? 0.5 : 1,
        }}
        onMouseEnter={(e) => {
          if (!isExporting && transcription.length > 0) {
            e.currentTarget.style.backgroundColor = '#059669';
          }
        }}
        onMouseLeave={(e) => {
          if (!isExporting && transcription.length > 0) {
            e.currentTarget.style.backgroundColor = '#10b981';
          }
        }}
      >
        {isExporting ? (
          <>
            <div
              style={{
                width: '14px',
                height: '14px',
                borderRadius: '50%',
                border: '2px solid white',
                borderTopColor: 'transparent',
                animation: 'spin 1s linear infinite',
              }}
            />
            Exporting...
          </>
        ) : (
          <>
            <span>📥</span>
            Export
          </>
        )}
      </button>

      {/* Dropdown Menu */}
      {showMenu && !isExporting && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setShowMenu(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 999,
            }}
          />

          {/* Menu */}
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              right: 0,
              minWidth: '220px',
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
              zIndex: 1000,
              overflow: 'hidden',
            }}
          >
            {/* HTML Export */}
            <button
              onClick={handleExportHTML}
              style={{
                width: '100%',
                padding: '12px 16px',
                fontSize: '14px',
                color: '#1f2937',
                backgroundColor: 'transparent',
                border: 'none',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f9fafb';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <span style={{ fontSize: '20px' }}>🌐</span>
              <div>
                <div style={{ fontWeight: '500' }}>HTML File</div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                  Self-contained, offline-ready
                </div>
              </div>
            </button>

            {/* Text Export */}
            <button
              onClick={handleExportText}
              style={{
                width: '100%',
                padding: '12px 16px',
                fontSize: '14px',
                color: '#1f2937',
                backgroundColor: 'transparent',
                border: 'none',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f9fafb';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <span style={{ fontSize: '20px' }}>📄</span>
              <div>
                <div style={{ fontWeight: '500' }}>Plain Text</div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                  Simple .txt format
                </div>
              </div>
            </button>

            {/* Copy to Clipboard */}
            <button
              onClick={handleCopyToClipboard}
              style={{
                width: '100%',
                padding: '12px 16px',
                fontSize: '14px',
                color: '#1f2937',
                backgroundColor: 'transparent',
                border: 'none',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                transition: 'background-color 0.2s',
                borderTop: '1px solid #f3f4f6',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f9fafb';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <span style={{ fontSize: '20px' }}>📋</span>
              <div>
                <div style={{ fontWeight: '500' }}>Copy to Clipboard</div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                  Quick copy & paste
                </div>
              </div>
            </button>
          </div>
        </>
      )}

      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default ExportButton;