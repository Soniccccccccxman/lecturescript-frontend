import React, { useState, useEffect, useMemo } from 'react';
import type { RecordingEntry, LibraryFilters, LibraryStats } from '../../types/library';
import { libraryStorage } from '../../utils/libraryStorage';
import LibraryHeader from './LibraryHeader';
import LibraryFiltersPanel from './LibraryFiltersPanel';
import LibraryGrid from './LibraryGrid';
import RecordingModal from './RecordingModal';

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

interface LibraryViewProps {
  theme: Theme;
  onExportRecording?: (recording: RecordingEntry) => void;
}

const defaultFilters: LibraryFilters = {
  search: '',
  dateRange: {},
  tags: [],
  sortBy: 'dateCreated',
  sortOrder: 'desc',
  showArchived: false,
  showFavorites: false
};

const LibraryView: React.FC<LibraryViewProps> = ({ theme, onExportRecording }) => {
  const [recordings, setRecordings] = useState<RecordingEntry[]>([]);
  const [filteredRecordings, setFilteredRecordings] = useState<RecordingEntry[]>([]);
  const [filters, setFilters] = useState<LibraryFilters>(defaultFilters);
  const [stats, setStats] = useState<LibraryStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRecording, setSelectedRecording] = useState<RecordingEntry | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [availableTags, setAvailableTags] = useState<string[]>([]);

  // Load data on mount
  useEffect(() => {
    loadLibraryData();
  }, []);

  // Apply filters when they change
  useEffect(() => {
    applyFilters();
  }, [recordings, filters]);

  const loadLibraryData = async () => {
    try {
      setIsLoading(true);
      const [recordingsData, statsData, tagsData] = await Promise.all([
        libraryStorage.getAllRecordings(),
        libraryStorage.getLibraryStats(),
        libraryStorage.getAllTags()
      ]);

      setRecordings(recordingsData);
      setStats(statsData);
      setAvailableTags(tagsData);
    } catch (error) {
      console.error('Failed to load library data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = async () => {
    try {
      const filtered = await libraryStorage.getFilteredRecordings(filters);
      setFilteredRecordings(filtered);
    } catch (error) {
      console.error('Failed to apply filters:', error);
      setFilteredRecordings(recordings);
    }
  };

  const handleFilterChange = (newFilters: Partial<LibraryFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleRecordingAction = async (action: string, recording: RecordingEntry) => {
    try {
      switch (action) {
        case 'favorite':
          await libraryStorage.toggleFavorite(recording.id);
          break;
        case 'archive':
          await libraryStorage.toggleArchive(recording.id);
          break;
        case 'delete':
          if (window.confirm('Are you sure you want to delete this recording?')) {
            await libraryStorage.deleteRecording(recording.id);
          }
          break;
        case 'export':
          if (onExportRecording) {
            onExportRecording(recording);
          }
          break;
        case 'view':
          setSelectedRecording(recording);
          break;
      }

      // Reload data after actions
      if (action !== 'view' && action !== 'export') {
        await loadLibraryData();
      }
    } catch (error) {
      console.error(`Failed to ${action} recording:`, error);
    }
  };

  const handleAddTag = async (recordingId: string, tag: string) => {
    try {
      await libraryStorage.addTag(recordingId, tag);
      await loadLibraryData();
    } catch (error) {
      console.error('Failed to add tag:', error);
    }
  };

  const handleRemoveTag = async (recordingId: string, tag: string) => {
    try {
      await libraryStorage.removeTag(recordingId, tag);
      await loadLibraryData();
    } catch (error) {
      console.error('Failed to remove tag:', error);
    }
  };

  const handleUpdateRecording = async (recordingId: string, updates: Partial<RecordingEntry>) => {
    try {
      await libraryStorage.updateRecording(recordingId, updates);
      await loadLibraryData();

      // Update selected recording if it's currently open
      if (selectedRecording && selectedRecording.id === recordingId) {
        const updated = await libraryStorage.getRecording(recordingId);
        if (updated) {
          setSelectedRecording(updated);
        }
      }
    } catch (error) {
      console.error('Failed to update recording:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div
            className="w-8 h-8 mx-auto mb-4 rounded-full animate-spin border-2 border-transparent"
            style={{
              borderTopColor: theme.accent,
              borderRightColor: theme.accent
            }}
          />
          <p style={{ color: theme.textSecondary }}>Loading library...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Library Header */}
      <LibraryHeader
        theme={theme}
        stats={stats}
        filters={filters}
        onFilterChange={handleFilterChange}
        onToggleFilters={() => setShowFilters(!showFilters)}
        showFilters={showFilters}
        recordingsCount={filteredRecordings.length}
        totalRecordings={recordings.length}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Filters Panel */}
        {showFilters && (
          <LibraryFiltersPanel
            theme={theme}
            filters={filters}
            onFilterChange={handleFilterChange}
            availableTags={availableTags}
            onClose={() => setShowFilters(false)}
          />
        )}

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          {filteredRecordings.length === 0 ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <div
                  className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: theme.hover }}
                >
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    style={{ color: theme.textSecondary }}
                  >
                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                  </svg>
                </div>
                <h3 className="text-lg font-medium mb-2" style={{ color: theme.text }}>
                  {recordings.length === 0 ? 'No recordings yet' : 'No recordings match your filters'}
                </h3>
                <p className="text-sm" style={{ color: theme.textSecondary }}>
                  {recordings.length === 0
                    ? 'Start recording to build your library'
                    : 'Try adjusting your search criteria'
                  }
                </p>
              </div>
            </div>
          ) : (
            <LibraryGrid
              theme={theme}
              recordings={filteredRecordings}
              onRecordingAction={handleRecordingAction}
              onAddTag={handleAddTag}
              onRemoveTag={handleRemoveTag}
            />
          )}
        </div>
      </div>

      {/* Recording Detail Modal */}
      {selectedRecording && (
        <RecordingModal
          theme={theme}
          recording={selectedRecording}
          onClose={() => setSelectedRecording(null)}
          onUpdate={handleUpdateRecording}
          onAction={handleRecordingAction}
          onAddTag={handleAddTag}
          onRemoveTag={handleRemoveTag}
        />
      )}
    </div>
  );
};

export default LibraryView;