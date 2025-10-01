import React, { useState } from 'react';
import type { RecordingEntry } from '../../types/library';
import type { LectureSession } from '../../types';
import { ExportModal } from './ExportModal';
import { BatchExportModal } from './BatchExportModal';
import { Button } from '../ui/Button';

interface ExportIntegrationProps {
  children: React.ReactNode;
  selectedRecordings?: RecordingEntry[];
  onBatchExport?: boolean;
}

export const ExportIntegration: React.FC<ExportIntegrationProps> = ({
  children,
  selectedRecordings = [],
  onBatchExport = false
}) => {
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [batchExportModalOpen, setBatchExportModalOpen] = useState(false);
  const [currentSession, setCurrentSession] = useState<LectureSession | null>(null);

  // Convert RecordingEntry to LectureSession format
  const convertToLectureSession = (recording: RecordingEntry): LectureSession => {
    return {
      id: recording.id,
      name: recording.title,
      startTime: recording.timestamp,
      endTime: recording.timestamp + (recording.duration * 1000),
      segments: recording.segments || [],
      summary: recording.summary,
      language: recording.language as 'zh' | 'en' | 'mixed',
      duration: recording.duration,
      wordCount: recording.wordCount,
      cost: recording.cost || 0,
      status: 'completed'
    };
  };

  const handleSingleExport = (recording: RecordingEntry) => {
    const session = convertToLectureSession(recording);
    setCurrentSession(session);
    setExportModalOpen(true);
  };

  const handleBatchExport = () => {
    const sessions = selectedRecordings.map(convertToLectureSession);
    setBatchExportModalOpen(true);
  };

  // Clone children and inject export handlers
  const childrenWithProps = React.Children.map(children, (child) => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child, {
        onExportRecording: handleSingleExport,
        ...child.props
      });
    }
    return child;
  });

  return (
    <>
      {childrenWithProps}

      {/* Batch Export Button */}
      {onBatchExport && selectedRecordings.length > 1 && (
        <div className="fixed bottom-6 right-6 z-40">
          <Button
            onClick={handleBatchExport}
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
          >
            📦 Export {selectedRecordings.length} Lectures
          </Button>
        </div>
      )}

      {/* Export Modal */}
      {exportModalOpen && currentSession && (
        <ExportModal
          isOpen={exportModalOpen}
          onClose={() => {
            setExportModalOpen(false);
            setCurrentSession(null);
          }}
          session={currentSession}
        />
      )}

      {/* Batch Export Modal */}
      {batchExportModalOpen && (
        <BatchExportModal
          isOpen={batchExportModalOpen}
          onClose={() => setBatchExportModalOpen(false)}
          sessions={selectedRecordings.map(convertToLectureSession)}
        />
      )}
    </>
  );
};

// Enhanced LibraryView wrapper with export functionality
interface EnhancedLibraryViewProps {
  theme: any;
  selectedRecordings?: RecordingEntry[];
  enableBatchExport?: boolean;
  children: React.ReactNode;
}

export const EnhancedLibraryView: React.FC<EnhancedLibraryViewProps> = ({
  theme,
  selectedRecordings = [],
  enableBatchExport = true,
  children
}) => {
  return (
    <ExportIntegration
      selectedRecordings={selectedRecordings}
      onBatchExport={enableBatchExport}
    >
      {children}
    </ExportIntegration>
  );
};

// Quick Export Button Component
interface QuickExportButtonProps {
  recording: RecordingEntry;
  variant?: 'icon' | 'button' | 'text';
  className?: string;
  showText?: boolean;
}

export const QuickExportButton: React.FC<QuickExportButtonProps> = ({
  recording,
  variant = 'icon',
  className = '',
  showText = false
}) => {
  const [exportModalOpen, setExportModalOpen] = useState(false);

  const convertToLectureSession = (recording: RecordingEntry): LectureSession => {
    return {
      id: recording.id,
      name: recording.title,
      startTime: recording.timestamp,
      endTime: recording.timestamp + (recording.duration * 1000),
      segments: recording.segments || [],
      summary: recording.summary,
      language: recording.language as 'zh' | 'en' | 'mixed',
      duration: recording.duration,
      wordCount: recording.wordCount,
      cost: recording.cost || 0,
      status: 'completed'
    };
  };

  const handleExport = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExportModalOpen(true);
  };

  if (variant === 'button') {
    return (
      <>
        <Button
          onClick={handleExport}
          variant="secondary"
          className={`${className}`}
        >
          📄 {showText ? 'Export' : ''}
        </Button>

        {exportModalOpen && (
          <ExportModal
            isOpen={exportModalOpen}
            onClose={() => setExportModalOpen(false)}
            session={convertToLectureSession(recording)}
          />
        )}
      </>
    );
  }

  if (variant === 'text') {
    return (
      <>
        <button
          onClick={handleExport}
          className={`text-blue-600 hover:text-blue-800 underline ${className}`}
        >
          Export
        </button>

        {exportModalOpen && (
          <ExportModal
            isOpen={exportModalOpen}
            onClose={() => setExportModalOpen(false)}
            session={convertToLectureSession(recording)}
          />
        )}
      </>
    );
  }

  // Default icon variant
  return (
    <>
      <button
        onClick={handleExport}
        className={`p-1.5 rounded transition-colors hover:bg-gray-100 ${className}`}
        title="Export recording"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        {showText && <span className="ml-1 text-xs">Export</span>}
      </button>

      {exportModalOpen && (
        <ExportModal
          isOpen={exportModalOpen}
          onClose={() => setExportModalOpen(false)}
          session={convertToLectureSession(recording)}
        />
      )}
    </>
  );
};

// Export Menu Component for header/toolbar
interface ExportMenuProps {
  recordings: RecordingEntry[];
  selectedRecordings?: RecordingEntry[];
  theme?: any;
}

export const ExportMenu: React.FC<ExportMenuProps> = ({
  recordings,
  selectedRecordings = [],
  theme
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [batchExportModalOpen, setBatchExportModalOpen] = useState(false);

  const handleExportAll = () => {
    setBatchExportModalOpen(true);
    setIsOpen(false);
  };

  const handleExportSelected = () => {
    setBatchExportModalOpen(true);
    setIsOpen(false);
  };

  const exportableRecordings = selectedRecordings.length > 0 ? selectedRecordings : recordings;

  return (
    <div className="relative">
      <Button
        onClick={() => setIsOpen(!isOpen)}
        variant="secondary"
        className="flex items-center gap-2"
      >
        📄 Export
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </Button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
            <div className="p-2">
              <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100 mb-2">
                Export Options
              </div>

              {selectedRecordings.length > 0 ? (
                <button
                  onClick={handleExportSelected}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md flex items-center gap-2"
                >
                  <span>📦</span>
                  <div>
                    <div>Export Selected ({selectedRecordings.length})</div>
                    <div className="text-xs text-gray-500">Export {selectedRecordings.length} selected lectures</div>
                  </div>
                </button>
              ) : (
                <button
                  onClick={handleExportAll}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md flex items-center gap-2"
                >
                  <span>📚</span>
                  <div>
                    <div>Export All ({recordings.length})</div>
                    <div className="text-xs text-gray-500">Export all {recordings.length} lectures</div>
                  </div>
                </button>
              )}

              <div className="border-t border-gray-100 mt-2 pt-2">
                <div className="px-3 py-1 text-xs text-gray-500">
                  💡 Individual exports are available on each lecture card
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {batchExportModalOpen && (
        <BatchExportModal
          isOpen={batchExportModalOpen}
          onClose={() => setBatchExportModalOpen(false)}
          sessions={exportableRecordings.map(recording => ({
            id: recording.id,
            name: recording.title,
            startTime: recording.timestamp,
            endTime: recording.timestamp + (recording.duration * 1000),
            segments: recording.segments || [],
            summary: recording.summary,
            language: recording.language as 'zh' | 'en' | 'mixed',
            duration: recording.duration,
            wordCount: recording.wordCount,
            cost: recording.cost || 0,
            status: 'completed'
          }))}
        />
      )}
    </div>
  );
};