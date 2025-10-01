import React from 'react';
import type { ViewMode } from '../../types/library';

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

interface ViewToggleProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  theme: Theme;
  recordingsCount?: number;
}

const ViewToggle: React.FC<ViewToggleProps> = ({
  currentView,
  onViewChange,
  theme,
  recordingsCount = 0
}) => {
  return (
    <div
      className="flex items-center bg-opacity-60 backdrop-blur-sm rounded-lg p-1"
      style={{
        backgroundColor: theme.surface,
        border: `1px solid ${theme.border}`
      }}
    >
      {/* Live Recording Tab */}
      <button
        onClick={() => onViewChange('live')}
        className={`
          relative px-4 py-2 rounded-md text-sm font-medium transition-all duration-200
          flex items-center gap-2
        `}
        style={{
          backgroundColor: currentView === 'live' ? theme.background : 'transparent',
          color: currentView === 'live' ? theme.text : theme.textSecondary,
          boxShadow: currentView === 'live' ? `0 1px 3px ${theme.shadow}` : 'none'
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
          <line x1="12" y1="19" x2="12" y2="23"/>
          <line x1="8" y1="23" x2="16" y2="23"/>
        </svg>
        Live Recording
        {currentView === 'live' && (
          <div className="absolute inset-x-0 -bottom-px h-0.5 bg-current rounded-full opacity-60" />
        )}
      </button>

      {/* Library Tab */}
      <button
        onClick={() => onViewChange('library')}
        className={`
          relative px-4 py-2 rounded-md text-sm font-medium transition-all duration-200
          flex items-center gap-2
        `}
        style={{
          backgroundColor: currentView === 'library' ? theme.background : 'transparent',
          color: currentView === 'library' ? theme.text : theme.textSecondary,
          boxShadow: currentView === 'library' ? `0 1px 3px ${theme.shadow}` : 'none'
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
        </svg>
        Library
        {recordingsCount > 0 && (
          <span
            className="text-xs px-1.5 py-0.5 rounded-full font-medium"
            style={{
              backgroundColor: theme.accent + '20',
              color: theme.accent
            }}
          >
            {recordingsCount}
          </span>
        )}
        {currentView === 'library' && (
          <div className="absolute inset-x-0 -bottom-px h-0.5 bg-current rounded-full opacity-60" />
        )}
      </button>
    </div>
  );
};

export default ViewToggle;