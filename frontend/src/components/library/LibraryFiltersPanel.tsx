import React, { useState } from 'react';
import type { LibraryFilters } from '../../types/library';

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

interface LibraryFiltersPanelProps {
  theme: Theme;
  filters: LibraryFilters;
  onFilterChange: (filters: Partial<LibraryFilters>) => void;
  availableTags: string[];
  onClose: () => void;
}

const LibraryFiltersPanel: React.FC<LibraryFiltersPanelProps> = ({
  theme,
  filters,
  onFilterChange,
  availableTags,
  onClose
}) => {
  const [newTag, setNewTag] = useState('');

  const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  const parseDate = (dateString: string): number => {
    return new Date(dateString).getTime();
  };

  const handleDateRangeChange = (type: 'start' | 'end', value: string) => {
    const timestamp = value ? parseDate(value) : undefined;
    onFilterChange({
      dateRange: {
        ...filters.dateRange,
        [type]: timestamp
      }
    });
  };

  const handleTagToggle = (tag: string) => {
    const isSelected = filters.tags.includes(tag);
    const newTags = isSelected
      ? filters.tags.filter(t => t !== tag)
      : [...filters.tags, tag];

    onFilterChange({ tags: newTags });
  };

  const handleAddNewTag = () => {
    if (newTag.trim() && !filters.tags.includes(newTag.trim())) {
      onFilterChange({ tags: [...filters.tags, newTag.trim()] });
      setNewTag('');
    }
  };

  const clearAllFilters = () => {
    onFilterChange({
      search: '',
      dateRange: {},
      hasPdfContext: undefined,
      hasAudio: undefined,
      tags: [],
      minDuration: undefined,
      maxDuration: undefined,
      showArchived: false,
      showFavorites: false
    });
  };

  return (
    <div
      className="w-80 border-r flex flex-col h-full"
      style={{
        backgroundColor: theme.surface,
        borderColor: theme.border
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 border-b flex items-center justify-between"
        style={{ borderColor: theme.border }}
      >
        <h3 className="font-medium" style={{ color: theme.text }}>
          Filters
        </h3>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-opacity-60 transition-colors"
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

      {/* Filters Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Date Range */}
        <div>
          <h4 className="text-sm font-medium mb-3" style={{ color: theme.text }}>
            Date Range
          </h4>
          <div className="space-y-2">
            <div>
              <label className="block text-xs mb-1" style={{ color: theme.textSecondary }}>
                From
              </label>
              <input
                type="date"
                value={filters.dateRange.start ? formatDate(new Date(filters.dateRange.start)) : ''}
                onChange={(e) => handleDateRangeChange('start', e.target.value)}
                className="w-full px-3 py-2 text-sm rounded border focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: theme.background,
                  borderColor: theme.border,
                  color: theme.text
                }}
              />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: theme.textSecondary }}>
                To
              </label>
              <input
                type="date"
                value={filters.dateRange.end ? formatDate(new Date(filters.dateRange.end)) : ''}
                onChange={(e) => handleDateRangeChange('end', e.target.value)}
                className="w-full px-3 py-2 text-sm rounded border focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: theme.background,
                  borderColor: theme.border,
                  color: theme.text
                }}
              />
            </div>
          </div>
        </div>

        {/* Content Type */}
        <div>
          <h4 className="text-sm font-medium mb-3" style={{ color: theme.text }}>
            Content Type
          </h4>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.hasPdfContext === true}
                onChange={(e) => onFilterChange({
                  hasPdfContext: e.target.checked ? true : undefined
                })}
                className="rounded border"
                style={{ accentColor: theme.accent }}
              />
              <span className="text-sm" style={{ color: theme.text }}>
                With PDF Context
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.hasPdfContext === false}
                onChange={(e) => onFilterChange({
                  hasPdfContext: e.target.checked ? false : undefined
                })}
                className="rounded border"
                style={{ accentColor: theme.accent }}
              />
              <span className="text-sm" style={{ color: theme.text }}>
                Without PDF Context
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.hasAudio === true}
                onChange={(e) => onFilterChange({
                  hasAudio: e.target.checked ? true : undefined
                })}
                className="rounded border"
                style={{ accentColor: theme.accent }}
              />
              <span className="text-sm" style={{ color: theme.text }}>
                With Audio
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.hasAudio === false}
                onChange={(e) => onFilterChange({
                  hasAudio: e.target.checked ? false : undefined
                })}
                className="rounded border"
                style={{ accentColor: theme.accent }}
              />
              <span className="text-sm" style={{ color: theme.text }}>
                Without Audio
              </span>
            </label>
          </div>
        </div>

        {/* Duration Range */}
        <div>
          <h4 className="text-sm font-medium mb-3" style={{ color: theme.text }}>
            Duration (minutes)
          </h4>
          <div className="space-y-2">
            <div>
              <label className="block text-xs mb-1" style={{ color: theme.textSecondary }}>
                Minimum
              </label>
              <input
                type="number"
                min="0"
                placeholder="0"
                value={filters.minDuration ? Math.floor(filters.minDuration / 60) : ''}
                onChange={(e) => onFilterChange({
                  minDuration: e.target.value ? parseInt(e.target.value) * 60 : undefined
                })}
                className="w-full px-3 py-2 text-sm rounded border focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: theme.background,
                  borderColor: theme.border,
                  color: theme.text
                }}
              />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: theme.textSecondary }}>
                Maximum
              </label>
              <input
                type="number"
                min="0"
                placeholder="∞"
                value={filters.maxDuration ? Math.floor(filters.maxDuration / 60) : ''}
                onChange={(e) => onFilterChange({
                  maxDuration: e.target.value ? parseInt(e.target.value) * 60 : undefined
                })}
                className="w-full px-3 py-2 text-sm rounded border focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: theme.background,
                  borderColor: theme.border,
                  color: theme.text
                }}
              />
            </div>
          </div>
        </div>

        {/* Tags */}
        <div>
          <h4 className="text-sm font-medium mb-3" style={{ color: theme.text }}>
            Tags
          </h4>

          {/* Add New Tag */}
          <div className="mb-3">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add tag..."
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddNewTag()}
                className="flex-1 px-3 py-2 text-sm rounded border focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: theme.background,
                  borderColor: theme.border,
                  color: theme.text
                }}
              />
              <button
                onClick={handleAddNewTag}
                disabled={!newTag.trim()}
                className="px-3 py-2 text-sm rounded border transition-colors disabled:opacity-50"
                style={{
                  backgroundColor: theme.accent,
                  borderColor: theme.accent,
                  color: 'white'
                }}
              >
                Add
              </button>
            </div>
          </div>

          {/* Available Tags */}
          {availableTags.length > 0 && (
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {availableTags.map((tag) => (
                <label key={tag} className="flex items-center gap-2 cursor-pointer p-1 rounded hover:bg-opacity-60" style={{ backgroundColor: filters.tags.includes(tag) ? theme.accent + '10' : 'transparent' }}>
                  <input
                    type="checkbox"
                    checked={filters.tags.includes(tag)}
                    onChange={() => handleTagToggle(tag)}
                    className="rounded border"
                    style={{ accentColor: theme.accent }}
                  />
                  <span className="text-sm" style={{ color: theme.text }}>
                    #{tag}
                  </span>
                </label>
              ))}
            </div>
          )}

          {availableTags.length === 0 && (
            <p className="text-sm text-center py-4" style={{ color: theme.textSecondary }}>
              No tags available
            </p>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div
        className="px-4 py-3 border-t"
        style={{ borderColor: theme.border }}
      >
        <button
          onClick={clearAllFilters}
          className="w-full px-3 py-2 text-sm rounded border transition-colors"
          style={{
            backgroundColor: theme.background,
            borderColor: theme.border,
            color: theme.textSecondary
          }}
        >
          Clear All Filters
        </button>
      </div>
    </div>
  );
};

export default LibraryFiltersPanel;