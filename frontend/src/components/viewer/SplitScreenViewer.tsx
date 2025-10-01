// 🎯 LectureScript MVP - Split Screen Viewer
// Split-screen layout with PDF on left, transcript on right
// Author: Peter Levler

import React, { useState, useCallback, useRef } from 'react';
import Split from 'react-split';
import { PDFViewer } from './PDFViewer';
import { TranscriptPanel } from './TranscriptPanel';
import { AudioPlayer } from './AudioPlayer';
import { ExportButton } from './ExportButton';
import type { TranscriptionSegment } from '../../types/transcription';
import type { AudioFile } from '../../types/upload';

interface SplitScreenViewerProps {
  pdfUrl?: string;
  transcription: TranscriptionSegment[];
  audioFile: AudioFile | null;
}

export const SplitScreenViewer: React.FC<SplitScreenViewerProps> = ({
  pdfUrl,
  transcription,
  audioFile,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [currentSegmentId, setCurrentSegmentId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const audioPlayerRef = useRef<HTMLAudioElement>(null);

  /**
   * Handle page change from PDF viewer
   */
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    console.log('📄 Page changed to:', page);
  }, []);

  /**
   * Handle segment click from transcript
   */
  const handleSegmentClick = useCallback((segmentId: string, timestamp: number) => {
    setCurrentSegmentId(segmentId);
    console.log('🎯 Segment clicked:', segmentId, 'at', timestamp);

    // TODO: Sync with PDF page if mapping exists
  }, []);

  /**
   * Handle search in transcript
   */
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  /**
   * Handle audio time update - auto-highlight current segment
   */
  const handleAudioTimeUpdate = useCallback((currentTime: number, currentSegment: TranscriptionSegment | null) => {
    if (currentSegment && currentSegment.id !== currentSegmentId) {
      setCurrentSegmentId(currentSegment.id);
    }
  }, [currentSegmentId]);

  return (
    <div
      className="animate-fade-in-up"
      style={{
        height: 'calc(100vh - 73px)',
        backgroundColor: 'var(--bg-secondary)',
        position: 'relative',
      }}
    >
      {/* 🎨 Minimalist Action Bar - Notion Style */}
      <div
        className="glass elevation-1"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'var(--blur-sm)',
          borderBottom: '1px solid var(--color-gray-200)',
          padding: 'var(--space-sm) var(--space-xl)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'var(--space-lg)',
        }}
      >
        {/* File Info - Subtle & Clean */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-lg)', flex: 1 }}>
          {audioFile && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                <span style={{ fontSize: 'var(--text-base)', opacity: 0.6 }}>🎵</span>
                <span
                  style={{
                    fontSize: 'var(--text-sm)',
                    fontWeight: 'var(--font-medium)',
                    color: 'var(--text-primary)',
                    maxWidth: '200px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {audioFile.name}
                </span>
              </div>

              {audioFile.duration && (
                <span style={{
                  fontSize: 'var(--text-xs)',
                  color: 'var(--text-tertiary)',
                  fontWeight: 'var(--font-medium)',
                }}>
                  {Math.floor(audioFile.duration / 60)}:{String(Math.floor(audioFile.duration % 60)).padStart(2, '0')}
                </span>
              )}
            </>
          )}

          {pdfUrl && (
            <>
              <span style={{ color: 'var(--color-gray-300)' }}>•</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                <span style={{ fontSize: 'var(--text-base)', opacity: 0.6 }}>📄</span>
                <span style={{
                  fontSize: 'var(--text-sm)',
                  color: 'var(--text-secondary)',
                  fontWeight: 'var(--font-medium)',
                }}>
                  Page {currentPage}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Export Button - Apple Style */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
          <ExportButton transcription={transcription} audioFile={audioFile} />
        </div>
      </div>

      {/* 🎨 Golden Ratio Split Screen (φ = 1.618) */}
      {pdfUrl ? (
        <Split
          sizes={[61.8, 38.2]}  // Golden Ratio: PDF gets major space, transcript gets minor
          minSize={[400, 300]}
          gutterSize={1}
          cursor="col-resize"
          style={{
            display: 'flex',
            height: 'calc(100% - 61px)',
          }}
          className="split-container transition-smooth"
        >
          {/* Left Panel: PDF Viewer - Major Section (61.8%) */}
          <div
            style={{
              height: '100%',
              backgroundColor: 'var(--color-white)',
              overflow: 'hidden',
              borderRight: '1px solid var(--color-gray-200)',
            }}
          >
            <PDFViewer
              pdfUrl={pdfUrl}
              currentPage={currentPage}
              onPageChange={handlePageChange}
            />
          </div>

          {/* Right Panel: Transcript - Minor Section (38.2%) */}
          <div
            style={{
              height: '100%',
              backgroundColor: 'var(--bg-tertiary)',
              overflow: 'hidden',
            }}
          >
            <TranscriptPanel
              transcription={transcription}
              currentSegmentId={currentSegmentId}
              searchQuery={searchQuery}
              onSegmentClick={handleSegmentClick}
              onSearch={handleSearch}
              audioPlayerRef={audioPlayerRef}
            />
          </div>
        </Split>
      ) : (
        // No PDF: Full-width transcript
        <div
          style={{
            height: 'calc(100% - 61px)',
            maxWidth: '900px',
            margin: '0 auto',
            backgroundColor: '#f9fafb',
          }}
        >
          <TranscriptPanel
            transcription={transcription}
            currentSegmentId={currentSegmentId}
            searchQuery={searchQuery}
            onSegmentClick={handleSegmentClick}
            onSearch={handleSearch}
            audioPlayerRef={audioPlayerRef}
          />
        </div>
      )}

      {/* 🎵 Audio Player - Fixed at bottom */}
      <AudioPlayer
        audioFile={audioFile}
        transcription={transcription}
        onTimeUpdate={handleAudioTimeUpdate}
      />

      {/* Styles for Split */}
      <style>
        {`
          .split-container .gutter {
            background-color: #e5e7eb;
            background-repeat: no-repeat;
            background-position: 50%;
            transition: background-color 0.2s;
          }

          .split-container .gutter:hover {
            background-color: #3b82f6;
          }

          .split-container .gutter.gutter-horizontal {
            cursor: col-resize;
            background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="8" height="100"><rect width="2" height="100" x="0" fill="%23ffffff"/><rect width="2" height="100" x="6" fill="%23ffffff"/></svg>');
          }
        `}
      </style>
    </div>
  );
};

export default SplitScreenViewer;