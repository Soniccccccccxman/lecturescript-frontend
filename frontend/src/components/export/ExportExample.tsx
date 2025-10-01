import React, { useState } from 'react';
import type { RecordingEntry } from '../../types/library';
import type { LectureSession } from '../../types';
import { ExportModal } from './ExportModal';
import { BatchExportModal } from './BatchExportModal';
import { ExportProgressModal } from './ExportProgressModal';
import { QuickExportButton, ExportMenu } from './ExportIntegration';

// Example: How to integrate export functionality into your existing components

// 1. Enhanced Recording Card with Export
interface EnhancedRecordingCardProps {
  recording: RecordingEntry;
  onExport?: (recording: RecordingEntry) => void;
}

const EnhancedRecordingCard: React.FC<EnhancedRecordingCardProps> = ({
  recording,
  onExport
}) => {
  const handleExport = () => {
    if (onExport) {
      onExport(recording);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
      {/* Card Header */}
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-medium text-gray-900 line-clamp-2">{recording.title}</h3>
        <div className="flex items-center gap-1 ml-2">
          {/* Quick Export Button */}
          <QuickExportButton
            recording={recording}
            variant="icon"
            className="text-gray-500 hover:text-blue-600"
          />
        </div>
      </div>

      {/* Card Content */}
      <div className="text-sm text-gray-600 mb-3">
        <div className="flex items-center gap-4">
          <span>⏱️ {Math.floor(recording.duration / 60)}m</span>
          <span>📝 {recording.wordCount} words</span>
          <span>🗣️ {recording.language}</span>
        </div>
      </div>

      {/* Card Actions */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500">
          {new Date(recording.timestamp).toLocaleDateString()}
        </div>
        <div className="flex items-center gap-2">
          <QuickExportButton
            recording={recording}
            variant="button"
            showText
            className="text-xs"
          />
        </div>
      </div>
    </div>
  );
};

// 2. Enhanced Library Header with Export Menu
interface EnhancedLibraryHeaderProps {
  recordings: RecordingEntry[];
  selectedRecordings: RecordingEntry[];
  onSearch?: (query: string) => void;
}

const EnhancedLibraryHeader: React.FC<EnhancedLibraryHeaderProps> = ({
  recordings,
  selectedRecordings,
  onSearch
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (onSearch) {
      onSearch(query);
    }
  };

  return (
    <div className="bg-white border-b border-gray-200 p-4">
      <div className="flex items-center justify-between">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearch}
              placeholder="Search lectures..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <div className="absolute left-3 top-2.5 text-gray-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Statistics */}
          <div className="text-sm text-gray-600">
            {recordings.length} lectures
            {selectedRecordings.length > 0 && (
              <span className="ml-2 text-blue-600">
                • {selectedRecordings.length} selected
              </span>
            )}
          </div>

          {/* Export Menu */}
          <ExportMenu
            recordings={recordings}
            selectedRecordings={selectedRecordings}
          />
        </div>
      </div>
    </div>
  );
};

// 3. Complete Example App Component
const ExportExampleApp: React.FC = () => {
  // Sample data
  const [recordings] = useState<RecordingEntry[]>([
    {
      id: '1',
      title: 'Introduction to Machine Learning - Lecture 1',
      timestamp: Date.now() - 86400000, // 1 day ago
      duration: 3600, // 1 hour
      wordCount: 8500,
      language: 'en',
      tags: ['machine-learning', 'introduction'],
      segments: [],
      summary: 'Overview of machine learning concepts, supervised vs unsupervised learning, and common algorithms.',
      cost: 0.25,
      hasAudio: true,
      isFavorited: false,
      isArchived: false
    },
    {
      id: '2',
      title: '香港歷史與文化 - 第一講',
      timestamp: Date.now() - 172800000, // 2 days ago
      duration: 2700, // 45 minutes
      wordCount: 6200,
      language: 'mixed',
      tags: ['history', 'culture', 'hong-kong'],
      segments: [],
      summary: '香港歷史發展概述，從古代漁村到現代國際都市的演變過程。',
      cost: 0.18,
      hasAudio: true,
      isFavorited: true,
      isArchived: false
    },
    {
      id: '3',
      title: 'Data Structures and Algorithms - Arrays and Linked Lists',
      timestamp: Date.now() - 259200000, // 3 days ago
      duration: 4200, // 70 minutes
      wordCount: 9800,
      language: 'en',
      tags: ['programming', 'data-structures', 'algorithms'],
      segments: [],
      summary: 'Deep dive into array operations, time complexity, and linked list implementations with practical examples.',
      cost: 0.32,
      hasAudio: true,
      isFavorited: false,
      isArchived: false
    }
  ]);

  const [selectedRecordings, setSelectedRecordings] = useState<RecordingEntry[]>([]);
  const [filteredRecordings, setFilteredRecordings] = useState<RecordingEntry[]>(recordings);

  // Handle single export
  const handleSingleExport = (recording: RecordingEntry) => {
    console.log('Exporting single recording:', recording.title);
    // The QuickExportButton component handles this automatically
  };

  // Handle search
  const handleSearch = (query: string) => {
    if (!query.trim()) {
      setFilteredRecordings(recordings);
      return;
    }

    const filtered = recordings.filter(recording =>
      recording.title.toLowerCase().includes(query.toLowerCase()) ||
      recording.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase())) ||
      (recording.summary && recording.summary.toLowerCase().includes(query.toLowerCase()))
    );

    setFilteredRecordings(filtered);
  };

  // Handle recording selection
  const toggleRecordingSelection = (recording: RecordingEntry) => {
    setSelectedRecordings(prev => {
      const isSelected = prev.some(r => r.id === recording.id);
      if (isSelected) {
        return prev.filter(r => r.id !== recording.id);
      } else {
        return [...prev, recording];
      }
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <EnhancedLibraryHeader
        recordings={filteredRecordings}
        selectedRecordings={selectedRecordings}
        onSearch={handleSearch}
      />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Lecture Library with Export Functionality
          </h1>
          <p className="text-gray-600">
            This example demonstrates comprehensive export functionality integration.
            Click export buttons to see the export modal in action.
          </p>
        </div>

        {/* Selection Info */}
        {selectedRecordings.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-blue-900">
                  {selectedRecordings.length} lectures selected
                </h3>
                <p className="text-sm text-blue-700">
                  Total duration: {Math.floor(selectedRecordings.reduce((acc, r) => acc + r.duration, 0) / 60)} minutes
                  • Total words: {selectedRecordings.reduce((acc, r) => acc + r.wordCount, 0).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedRecordings([])}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Clear selection
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Recordings Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRecordings.map((recording) => (
            <div key={recording.id} className="relative">
              {/* Selection Checkbox */}
              <div className="absolute top-2 left-2 z-10">
                <input
                  type="checkbox"
                  checked={selectedRecordings.some(r => r.id === recording.id)}
                  onChange={() => toggleRecordingSelection(recording)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>

              {/* Enhanced Recording Card */}
              <div className={`transition-all ${
                selectedRecordings.some(r => r.id === recording.id)
                  ? 'ring-2 ring-blue-500 ring-opacity-50'
                  : ''
              }`}>
                <EnhancedRecordingCard
                  recording={recording}
                  onExport={handleSingleExport}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredRecordings.length === 0 && (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No lectures found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Try adjusting your search terms or create a new lecture.
            </p>
          </div>
        )}

        {/* Export Usage Examples */}
        <div className="mt-12 bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Export Integration Examples
          </h2>

          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <QuickExportButton
                recording={recordings[0]}
                variant="icon"
              />
              <span className="text-sm text-gray-600">Icon export button (used in cards)</span>
            </div>

            <div className="flex items-center gap-4">
              <QuickExportButton
                recording={recordings[0]}
                variant="button"
                showText
              />
              <span className="text-sm text-gray-600">Button with text</span>
            </div>

            <div className="flex items-center gap-4">
              <QuickExportButton
                recording={recordings[0]}
                variant="text"
              />
              <span className="text-sm text-gray-600">Text link style</span>
            </div>
          </div>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">Available Export Formats:</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-gray-600">
              <div>📄 PDF</div>
              <div>📝 DOCX</div>
              <div>📃 TXT</div>
              <div>📋 Markdown</div>
              <div>💾 JSON</div>
              <div>📚 Notion</div>
              <div>📄 Google Docs</div>
              <div>📦 Batch ZIP</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportExampleApp;