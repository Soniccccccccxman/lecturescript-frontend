import React, { useState } from 'react';
import type { RecordingEntry } from '../../types/library';

interface Theme {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  hover: string;
  shadow: string;
}

interface RecordingCardProps {
  theme: Theme;
  recording: RecordingEntry;
  onAction: (action: string, recording: RecordingEntry) => void;
  onAddTag: (recordingId: string, tag: string) => void;
  onRemoveTag: (recordingId: string, tag: string) => void;
}

const RecordingCard: React.FC<RecordingCardProps> = ({
  theme,
  recording,
  onAction,
  onAddTag,
  onRemoveTag
}) => {
  const [showFullTranscript, setShowFullTranscript] = useState(false);

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays - 1} days ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getPreviewText = (text: string, maxLength: number = 120): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  };

  return (
    <div
      className="rounded-lg border transition-all duration-200 hover:shadow-lg cursor-pointer group"
      style={{
        backgroundColor: theme.surface,
        borderColor: theme.border,
        boxShadow: `0 1px 3px ${theme.shadow}`
      }}
      onClick={() => onAction('view', recording)}
    >
      {/* Card Header */}
      <div className="p-4 border-b" style={{ borderColor: theme.border }}>
        <div className="flex items-start justify-between mb-2">
          <h3
            className="font-medium text-sm leading-tight line-clamp-2 group-hover:text-opacity-80 transition-colors"
            style={{ color: theme.text }}
          >
            {recording.title}
          </h3>

          <div className="flex items-center gap-1 ml-2 flex-shrink-0">
            {/* Favorite Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAction('favorite', recording);
              }}
              className="p-1 rounded hover:bg-opacity-60 transition-colors"
              style={{
                color: recording.isFavorited ? '#f59e0b' : theme.textSecondary,
                backgroundColor: recording.isFavorited ? '#f59e0b20' : 'transparent'
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill={recording.isFavorited ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth="2"
              >
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
            </button>

            {/* Archive Status */}
            {recording.isArchived && (
              <div
                className="p-1 rounded"
                style={{ color: theme.textSecondary }}
                title="Archived"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="21 8 21 21 3 21 3 8"/>
                  <rect x="1" y="3" width="22" height="5"/>
                  <line x1="10" y1="12" x2="14" y2="12"/>
                </svg>
              </div>
            )}
          </div>
        </div>

        {/* Metadata Row */}
        <div className="flex items-center gap-3 text-xs" style={{ color: theme.textSecondary }}>
          <span>{formatDate(recording.dateCreated)}</span>
          <span>•</span>
          <span>{formatDuration(recording.duration)}</span>
          <span>•</span>
          <span>{recording.wordCount} words</span>
        </div>

        {/* PDF Context Indicator */}
        {recording.pdfContext && (
          <div
            className="mt-2 inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium"
            style={{
              backgroundColor: theme.accent + '15',
              color: theme.accent
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14,2 14,8 20,8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10,9 9,9 8,9"/>
            </svg>
            {recording.pdfContext.title}
          </div>
        )}
      </div>

      {/* Content Preview */}
      <div className="p-4">
        {/* Key Topics */}
        {recording.keyTopics.length > 0 && (
          <div className="mb-3">
            <div className="flex flex-wrap gap-1">
              {recording.keyTopics.slice(0, 3).map((topic, index) => (
                <span
                  key={index}
                  className="inline-block px-2 py-0.5 rounded text-xs font-medium"
                  style={{
                    backgroundColor: theme.accent + '10',
                    color: theme.accent
                  }}
                >
                  {topic}
                </span>
              ))}
              {recording.keyTopics.length > 3 && (
                <span
                  className="inline-block px-2 py-0.5 rounded text-xs font-medium"
                  style={{
                    backgroundColor: theme.hover,
                    color: theme.textSecondary
                  }}
                >
                  +{recording.keyTopics.length - 3}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Transcript Preview */}
        <p
          className="text-sm leading-relaxed line-clamp-3"
          style={{ color: theme.textSecondary }}
        >
          {getPreviewText(recording.transcript)}
        </p>

        {/* Tags */}
        {recording.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {recording.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs"
                style={{
                  backgroundColor: theme.hover,
                  color: theme.textSecondary
                }}
              >
                #{tag}
              </span>
            ))}
            {recording.tags.length > 3 && (
              <span
                className="inline-block px-1.5 py-0.5 rounded text-xs"
                style={{
                  backgroundColor: theme.hover,
                  color: theme.textSecondary
                }}
              >
                +{recording.tags.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Action Bar */}
      <div
        className="px-4 py-3 border-t flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ borderColor: theme.border }}
      >
        <div className="flex items-center gap-2">
          {/* Play Audio Button */}
          {recording.hasAudio && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAction('play', recording);
              }}
              className="p-1.5 rounded transition-colors hover:bg-opacity-60"
              style={{
                color: theme.textSecondary,
                backgroundColor: theme.hover
              }}
              title="Play audio"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
            </button>
          )}

          {/* Export Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAction('export', recording);
            }}
            className="p-1.5 rounded transition-colors hover:bg-opacity-60"
            style={{
              color: theme.textSecondary,
              backgroundColor: theme.hover
            }}
            title="Export recording"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Archive Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAction('archive', recording);
            }}
            className="p-1.5 rounded transition-colors hover:bg-opacity-60"
            style={{
              color: theme.textSecondary,
              backgroundColor: theme.hover
            }}
            title={recording.isArchived ? 'Unarchive' : 'Archive'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="21 8 21 21 3 21 3 8"/>
              <rect x="1" y="3" width="22" height="5"/>
              <line x1="10" y1="12" x2="14" y2="12"/>
            </svg>
          </button>

          {/* Delete Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAction('delete', recording);
            }}
            className="p-1.5 rounded transition-colors hover:bg-opacity-60 text-red-500 hover:bg-red-100"
            title="Delete recording"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default RecordingCard;