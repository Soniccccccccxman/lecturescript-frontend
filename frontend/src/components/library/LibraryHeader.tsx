import React from 'react';
import type { LibraryFilters, LibraryStats } from '../../types/library';

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

interface LibraryHeaderProps {
  theme: Theme;
  stats: LibraryStats | null;
  filters: LibraryFilters;
  onFilterChange: (filters: Partial<LibraryFilters>) => void;
  onToggleFilters: () => void;
  showFilters: boolean;
  recordingsCount: number;
  totalRecordings: number;
}

const LibraryHeader: React.FC<LibraryHeaderProps> = ({
  theme,
  stats,
  filters,
  onFilterChange,
  onToggleFilters,
  showFilters,
  recordingsCount,
  totalRecordings
}) => {
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatCost = (cost: number): string => {
    return `$${cost.toFixed(3)}`;
  };

  return (
    <div
      className="border-b px-6 py-4"
      style={{
        borderColor: theme.border,
        backgroundColor: theme.background
      }}
    >
      {/* Title and Stats Row */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold mb-1" style={{ color: theme.text }}>
            Recording Library
          </h2>
          <div className="flex items-center gap-4 text-sm" style={{ color: theme.textSecondary }}>
            <span>{recordingsCount} of {totalRecordings} recordings</span>
            {stats && (
              <>
                <span>•</span>
                <span>{formatDuration(stats.totalDuration)} total</span>
                <span>•</span>
                <span>{formatCost(stats.totalCost)} spent</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Quick Stats */}
          {stats && (
            <div className="flex items-center gap-4 text-sm" style={{ color: theme.textSecondary }}>
              <div className="text-center">
                <div className="font-medium" style={{ color: theme.text }}>
                  {stats.recordingsWithPdf}
                </div>
                <div>with PDF</div>
              </div>
              <div className="text-center">
                <div className="font-medium" style={{ color: theme.text }}>
                  {stats.recordingsWithAudio}
                </div>
                <div>with audio</div>
              </div>
            </div>
          )}

          {/* Filter Toggle */}
          <button
            onClick={onToggleFilters}
            className={`
              px-3 py-2 rounded-md text-sm font-medium transition-all duration-200
              flex items-center gap-2
            `}
            style={{
              backgroundColor: showFilters ? theme.accent + '15' : theme.surface,
              color: showFilters ? theme.accent : theme.text,
              border: `1px solid ${showFilters ? theme.accent + '30' : theme.border}`
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
            </svg>
            Filters
          </button>
        </div>
      </div>

      {/* Search and Sort Row */}
      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{ color: theme.textSecondary }}
            >
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search recordings, transcripts, topics..."
            value={filters.search}
            onChange={(e) => onFilterChange({ search: e.target.value })}
            className="w-full pl-10 pr-4 py-2 rounded-md text-sm transition-all duration-200 border focus:outline-none focus:ring-2"
            style={{
              backgroundColor: theme.surface,
              borderColor: theme.border,
              color: theme.text,
              focusRingColor: theme.accent + '50'
            }}
          />
        </div>

        {/* Sort Options */}
        <select
          value={`${filters.sortBy}-${filters.sortOrder}`}
          onChange={(e) => {
            const [sortBy, sortOrder] = e.target.value.split('-') as [typeof filters.sortBy, typeof filters.sortOrder];
            onFilterChange({ sortBy, sortOrder });
          }}
          className="px-3 py-2 rounded-md text-sm border focus:outline-none focus:ring-2"
          style={{
            backgroundColor: theme.surface,
            borderColor: theme.border,
            color: theme.text
          }}
        >
          <option value="dateCreated-desc">Newest first</option>
          <option value="dateCreated-asc">Oldest first</option>
          <option value="duration-desc">Longest first</option>
          <option value="duration-asc">Shortest first</option>
          <option value="title-asc">Title A-Z</option>
          <option value="title-desc">Title Z-A</option>
          <option value="wordCount-desc">Most words</option>
          <option value="wordCount-asc">Fewest words</option>
        </select>

        {/* View Options */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onFilterChange({ showFavorites: !filters.showFavorites })}
            className={`
              p-2 rounded-md transition-all duration-200
            `}
            style={{
              backgroundColor: filters.showFavorites ? theme.accent + '15' : 'transparent',
              color: filters.showFavorites ? theme.accent : theme.textSecondary
            }}
            title="Show only favorites"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill={filters.showFavorites ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
          </button>

          <button
            onClick={() => onFilterChange({ showArchived: !filters.showArchived })}
            className={`
              p-2 rounded-md transition-all duration-200
            `}
            style={{
              backgroundColor: filters.showArchived ? theme.accent + '15' : 'transparent',
              color: filters.showArchived ? theme.accent : theme.textSecondary
            }}
            title={filters.showArchived ? 'Hide archived' : 'Show archived'}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="21 8 21 21 3 21 3 8"/>
              <rect x="1" y="3" width="22" height="5"/>
              <line x1="10" y1="12" x2="14" y2="12"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Active Filters Display */}
      {(filters.tags.length > 0 || filters.hasPdfContext !== undefined || filters.hasAudio !== undefined || filters.dateRange.start || filters.dateRange.end) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {filters.tags.map(tag => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
              style={{
                backgroundColor: theme.accent + '15',
                color: theme.accent
              }}
            >
              #{tag}
              <button
                onClick={() => onFilterChange({ tags: filters.tags.filter(t => t !== tag) })}
                className="hover:opacity-70"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </span>
          ))}

          {filters.hasPdfContext !== undefined && (
            <span
              className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
              style={{
                backgroundColor: theme.accent + '15',
                color: theme.accent
              }}
            >
              {filters.hasPdfContext ? 'With PDF' : 'Without PDF'}
              <button
                onClick={() => onFilterChange({ hasPdfContext: undefined })}
                className="hover:opacity-70"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </span>
          )}

          {filters.hasAudio !== undefined && (
            <span
              className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
              style={{
                backgroundColor: theme.accent + '15',
                color: theme.accent
              }}
            >
              {filters.hasAudio ? 'With Audio' : 'Without Audio'}
              <button
                onClick={() => onFilterChange({ hasAudio: undefined })}
                className="hover:opacity-70"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default LibraryHeader;