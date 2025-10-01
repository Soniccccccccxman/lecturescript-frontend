import React, { useState, useRef, useEffect } from 'react';
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

interface RecordingModalProps {
  theme: Theme;
  recording: RecordingEntry;
  onClose: () => void;
  onUpdate: (recordingId: string, updates: Partial<RecordingEntry>) => void;
  onAction: (action: string, recording: RecordingEntry) => void;
  onAddTag: (recordingId: string, tag: string) => void;
  onRemoveTag: (recordingId: string, tag: string) => void;
}

const RecordingModal: React.FC<RecordingModalProps> = ({
  theme,
  recording,
  onClose,
  onUpdate,
  onAction,
  onAddTag,
  onRemoveTag
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(recording.title);
  const [editDescription, setEditDescription] = useState(recording.description || '');
  const [newTag, setNewTag] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (recording.audioBlob && audioRef.current) {
      const audioUrl = URL.createObjectURL(recording.audioBlob);
      audioRef.current.src = audioUrl;

      return () => {
        URL.revokeObjectURL(audioUrl);
      };
    }
  }, [recording.audioBlob]);

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
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

  const handleSaveEdit = () => {
    onUpdate(recording.id, {
      title: editTitle.trim() || recording.originalTitle || 'Untitled Recording',
      description: editDescription.trim()
    });
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditTitle(recording.title);
    setEditDescription(recording.description || '');
    setIsEditing(false);
  };

  const handleAddTag = () => {
    if (newTag.trim() && !recording.tags.includes(newTag.trim())) {
      onAddTag(recording.id, newTag.trim());
      setNewTag('');
    }
  };

  const handleAudioPlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        className="w-full max-w-4xl max-h-screen overflow-hidden rounded-lg shadow-2xl"
        style={{
          backgroundColor: theme.background,
          border: `1px solid ${theme.border}`
        }}
      >
        {/* Header */}
        <div
          className="px-6 py-4 border-b flex items-center justify-between"
          style={{ borderColor: theme.border }}
        >
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full text-lg font-semibold bg-transparent border-none outline-none"
                style={{ color: theme.text }}
                placeholder="Recording title..."
                autoFocus
              />
            ) : (
              <h2 className="text-lg font-semibold truncate" style={{ color: theme.text }}>
                {recording.title}
              </h2>
            )}
            <div className="flex items-center gap-4 mt-1 text-sm" style={{ color: theme.textSecondary }}>
              <span>{formatDate(recording.dateCreated)}</span>
              <span>•</span>
              <span>{formatDuration(recording.duration)}</span>
              <span>•</span>
              <span>{recording.wordCount} words</span>
              {recording.cost > 0 && (
                <>
                  <span>•</span>
                  <span>${recording.cost.toFixed(3)}</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 ml-4">
            {/* Edit Toggle */}
            {isEditing ? (
              <>
                <button
                  onClick={handleSaveEdit}
                  className="px-3 py-1.5 text-sm rounded transition-colors"
                  style={{
                    backgroundColor: theme.accent,
                    color: 'white'
                  }}
                >
                  Save
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="px-3 py-1.5 text-sm rounded transition-colors"
                  style={{
                    backgroundColor: theme.surface,
                    color: theme.textSecondary,
                    border: `1px solid ${theme.border}`
                  }}
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="p-2 rounded transition-colors"
                style={{
                  color: theme.textSecondary,
                  backgroundColor: theme.hover
                }}
                title="Edit recording"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
            )}

            {/* Favorite */}
            <button
              onClick={() => onAction('favorite', recording)}
              className="p-2 rounded transition-colors"
              style={{
                color: recording.isFavorited ? '#f59e0b' : theme.textSecondary,
                backgroundColor: recording.isFavorited ? '#f59e0b20' : theme.hover
              }}
              title={recording.isFavorited ? 'Remove from favorites' : 'Add to favorites'}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill={recording.isFavorited ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth="2"
              >
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-2 rounded transition-colors"
              style={{
                color: theme.textSecondary,
                backgroundColor: theme.hover
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto max-h-96">
          <div className="p-6 space-y-6">
            {/* Audio Player */}
            {recording.hasAudio && recording.audioBlob && (
              <div
                className="p-4 rounded-lg border"
                style={{
                  backgroundColor: theme.surface,
                  borderColor: theme.border
                }}
              >
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleAudioPlay}
                    className="p-2 rounded-full transition-colors"
                    style={{
                      backgroundColor: theme.accent,
                      color: 'white'
                    }}
                  >
                    {isPlaying ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <rect x="6" y="4" width="4" height="16"/>
                        <rect x="14" y="4" width="4" height="16"/>
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <polygon points="5 3 19 12 5 21 5 3"/>
                      </svg>
                    )}
                  </button>
                  <div className="flex-1">
                    <audio
                      ref={audioRef}
                      onPlay={() => setIsPlaying(true)}
                      onPause={() => setIsPlaying(false)}
                      onEnded={() => setIsPlaying(false)}
                      controls
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* PDF Context */}
            {recording.pdfContext && (
              <div
                className="p-4 rounded-lg border"
                style={{
                  backgroundColor: theme.surface,
                  borderColor: theme.border
                }}
              >
                <h3 className="text-sm font-medium mb-2" style={{ color: theme.text }}>
                  📄 PDF Context
                </h3>
                <div className="space-y-2">
                  <div>
                    <span className="text-sm font-medium" style={{ color: theme.text }}>
                      {recording.pdfContext.title}
                    </span>
                    <span className="text-sm ml-2" style={{ color: theme.textSecondary }}>
                      ({recording.pdfContext.pageCount} pages)
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: theme.textSecondary }}>
                    {recording.pdfContext.summary}
                  </p>
                </div>
              </div>
            )}

            {/* Description */}
            {(isEditing || recording.description) && (
              <div>
                <h3 className="text-sm font-medium mb-2" style={{ color: theme.text }}>
                  Description
                </h3>
                {isEditing ? (
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Add a description..."
                    rows={3}
                    className="w-full px-3 py-2 text-sm rounded border resize-none focus:outline-none focus:ring-2"
                    style={{
                      backgroundColor: theme.surface,
                      borderColor: theme.border,
                      color: theme.text
                    }}
                  />
                ) : (
                  <p className="text-sm leading-relaxed" style={{ color: theme.textSecondary }}>
                    {recording.description}
                  </p>
                )}
              </div>
            )}

            {/* Key Topics */}
            {recording.keyTopics.length > 0 && (
              <div>
                <h3 className="text-sm font-medium mb-3" style={{ color: theme.text }}>
                  🎯 Key Topics
                </h3>
                <div className="flex flex-wrap gap-2">
                  {recording.keyTopics.map((topic, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 rounded-full text-sm font-medium"
                      style={{
                        backgroundColor: theme.accent + '15',
                        color: theme.accent
                      }}
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Tags */}
            <div>
              <h3 className="text-sm font-medium mb-3" style={{ color: theme.text }}>
                🏷️ Tags
              </h3>
              <div className="space-y-3">
                {/* Existing Tags */}
                {recording.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {recording.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded text-sm"
                        style={{
                          backgroundColor: theme.hover,
                          color: theme.text
                        }}
                      >
                        #{tag}
                        <button
                          onClick={() => onRemoveTag(recording.id, tag)}
                          className="hover:opacity-70"
                          style={{ color: theme.textSecondary }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                          </svg>
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Add New Tag */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add a tag..."
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                    className="flex-1 px-3 py-2 text-sm rounded border focus:outline-none focus:ring-2"
                    style={{
                      backgroundColor: theme.surface,
                      borderColor: theme.border,
                      color: theme.text
                    }}
                  />
                  <button
                    onClick={handleAddTag}
                    disabled={!newTag.trim()}
                    className="px-3 py-2 text-sm rounded transition-colors disabled:opacity-50"
                    style={{
                      backgroundColor: theme.accent,
                      color: 'white'
                    }}
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            {/* Transcript */}
            <div>
              <h3 className="text-sm font-medium mb-3" style={{ color: theme.text }}>
                📝 Transcript
              </h3>
              <div
                className="p-4 rounded-lg border max-h-64 overflow-y-auto"
                style={{
                  backgroundColor: theme.surface,
                  borderColor: theme.border
                }}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: theme.text }}>
                  {recording.transcript}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div
          className="px-6 py-4 border-t flex items-center justify-between"
          style={{ borderColor: theme.border }}
        >
          <div className="flex items-center gap-2">
            <button
              onClick={() => onAction('export', recording)}
              className="px-4 py-2 text-sm rounded transition-colors flex items-center gap-2"
              style={{
                backgroundColor: theme.accent,
                color: 'white'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Export
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onAction('archive', recording)}
              className="px-4 py-2 text-sm rounded transition-colors"
              style={{
                backgroundColor: theme.surface,
                color: theme.textSecondary,
                border: `1px solid ${theme.border}`
              }}
            >
              {recording.isArchived ? 'Unarchive' : 'Archive'}
            </button>

            <button
              onClick={() => onAction('delete', recording)}
              className="px-4 py-2 text-sm rounded transition-colors text-red-500 border border-red-200 hover:bg-red-50"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecordingModal;