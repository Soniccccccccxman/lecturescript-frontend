// 🎯 LectureScript MVP - Transcript Panel with Virtual Scrolling
// High-performance transcript display using react-window
// Author: Peter Levler

import React, { useState, useMemo, useCallback, useRef } from 'react';
import { FixedSizeList as List } from 'react-window';
import type { TranscriptionSegment } from '../../types/transcription';

interface TranscriptPanelProps {
  transcription: TranscriptionSegment[];
  currentSegmentId: string | null;
  searchQuery: string;
  onSegmentClick: (segmentId: string, timestamp: number) => void;
  onSearch: (query: string) => void;
  audioPlayerRef?: React.RefObject<HTMLAudioElement>;  // 新增：音訊播放器引用
}

export const TranscriptPanel: React.FC<TranscriptPanelProps> = ({
  transcription,
  currentSegmentId,
  searchQuery,
  onSegmentClick,
  onSearch,
  audioPlayerRef,
}) => {
  const [localSearch, setLocalSearch] = useState('');
  const listRef = useRef<List>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const activeSegmentRef = useRef<HTMLDivElement>(null);

  /**
   * Format timestamp to MM:SS
   */
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  /**
   * Filter and highlight segments based on search
   */
  const filteredSegments = useMemo(() => {
    if (!searchQuery) return transcription;

    const query = searchQuery.toLowerCase();
    return transcription.filter(seg =>
      seg.text.toLowerCase().includes(query)
    );
  }, [transcription, searchQuery]);

  /**
   * Highlight search term in text
   */
  const highlightText = (text: string, query: string): React.ReactNode => {
    if (!query) return text;

    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, idx) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark
          key={idx}
          style={{
            backgroundColor: '#fef08a',
            color: '#1f2937',
            padding: '2px 0',
          }}
        >
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  /**
   * Handle search submit
   */
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(localSearch);
  };

  /**
   * Clear search
   */
  const clearSearch = () => {
    setLocalSearch('');
    onSearch('');
  };

  /**
   * Render individual segment row
   */
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const segment = filteredSegments[index];
    const isActive = segment.id === currentSegmentId;

    return (
      <div
        ref={isActive ? activeSegmentRef : null}
        style={{
          ...style,
          padding: 'var(--space-md) var(--space-lg)',
          cursor: 'pointer',
          backgroundColor: isActive ? 'rgba(255, 200, 0, 0.15)' : 'transparent',
          borderLeft: isActive ? '4px solid var(--color-primary)' : '4px solid transparent',
          borderBottom: '1px solid var(--color-gray-100)',
          transition: 'all var(--transition-base)',
          boxShadow: isActive ? 'inset 0 0 20px rgba(0, 122, 255, 0.1)' : 'none',
        }}
        onClick={() => {
          onSegmentClick(segment.id, segment.start);
          // 點擊時跳轉音訊時間
          if (audioPlayerRef?.current) {
            audioPlayerRef.current.currentTime = segment.start;
            audioPlayerRef.current.play();
          }
        }}
        onMouseEnter={(e) => {
          if (!isActive) {
            e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isActive) {
            e.currentTarget.style.backgroundColor = 'transparent';
          }
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
          {/* Timestamp */}
          <div
            style={{
              minWidth: '60px',
              fontSize: '12px',
              fontWeight: '500',
              color: isActive ? '#3b82f6' : '#6b7280',
              fontFamily: 'monospace',
              paddingTop: '2px',
            }}
          >
            {formatTime(segment.start)}
          </div>

          {/* Content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Speaker */}
            {segment.speaker && (
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#3b82f6',
                  marginBottom: '4px',
                }}
              >
                {segment.speaker}
              </div>
            )}

            {/* Text */}
            <div
              style={{
                fontSize: '15px',
                lineHeight: '1.6',
                color: '#1f2937',
                wordBreak: 'break-word',
              }}
            >
              {highlightText(segment.text, searchQuery)}
            </div>
          </div>
        </div>
      </div>
    );
  };

  /**
   * Get container height for virtual list
   */
  const getContainerHeight = () => {
    if (containerRef.current) {
      return containerRef.current.clientHeight - 73; // minus search bar
    }
    return 600;
  };

  /**
   * Auto-scroll to active segment when currentSegmentId changes
   */
  React.useEffect(() => {
    if (currentSegmentId && activeSegmentRef.current) {
      activeSegmentRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [currentSegmentId]);

  return (
    <div
      ref={containerRef}
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'white',
      }}
    >
      {/* Search Bar */}
      <div
        style={{
          padding: '16px 24px',
          borderBottom: '1px solid #e5e7eb',
          backgroundColor: 'white',
        }}
      >
        <form onSubmit={handleSearchSubmit}>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Search in transcript..."
              style={{
                width: '100%',
                padding: '10px 40px 10px 40px',
                fontSize: '14px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#3b82f6';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#d1d5db';
              }}
            />

            {/* Search Icon */}
            <span
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '18px',
                color: '#9ca3af',
              }}
            >
              🔍
            </span>

            {/* Clear Button */}
            {(localSearch || searchQuery) && (
              <button
                type="button"
                onClick={clearSearch}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '18px',
                  color: '#9ca3af',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                ✕
              </button>
            )}
          </div>
        </form>

        {/* Search Results Count */}
        {searchQuery && (
          <div
            style={{
              marginTop: '8px',
              fontSize: '12px',
              color: '#6b7280',
            }}
          >
            {filteredSegments.length} result{filteredSegments.length !== 1 ? 's' : ''} found
          </div>
        )}
      </div>

      {/* Transcript List */}
      {filteredSegments.length > 0 ? (
        <List
          ref={listRef}
          height={getContainerHeight()}
          itemCount={filteredSegments.length}
          itemSize={100} // Approximate height per segment
          width="100%"
          style={{
            overflow: 'auto',
          }}
        >
          {Row}
        </List>
      ) : (
        // Empty State
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '48px 24px',
          }}
        >
          {searchQuery ? (
            // No Search Results
            <>
              <span style={{ fontSize: '64px', marginBottom: '16px' }}>🔍</span>
              <div
                style={{
                  fontSize: '18px',
                  fontWeight: '500',
                  color: '#1f2937',
                  marginBottom: '8px',
                }}
              >
                No results found
              </div>
              <div style={{ fontSize: '14px', color: '#6b7280', textAlign: 'center' }}>
                Try different keywords or clear the search
              </div>
            </>
          ) : (
            // No Transcription
            <>
              <span style={{ fontSize: '64px', marginBottom: '16px' }}>📝</span>
              <div
                style={{
                  fontSize: '18px',
                  fontWeight: '500',
                  color: '#1f2937',
                  marginBottom: '8px',
                }}
              >
                No transcript available
              </div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>
                Upload an audio file to generate transcript
              </div>
            </>
          )}
        </div>
      )}

      {/* Stats Footer */}
      <div
        style={{
          padding: '12px 24px',
          borderTop: '1px solid #e5e7eb',
          backgroundColor: '#f9fafb',
          fontSize: '12px',
          color: '#6b7280',
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <span>
          {filteredSegments.length} segment{filteredSegments.length !== 1 ? 's' : ''}
        </span>
        {filteredSegments.length > 0 && (
          <span>
            Duration: {formatTime(filteredSegments[filteredSegments.length - 1].end)}
          </span>
        )}
      </div>
    </div>
  );
};

export default TranscriptPanel;