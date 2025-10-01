import React, { useState, useEffect } from 'react';
import type { LectureSession, BatchExportOptions, ExportProgress } from '../../types';
import { EnhancedExportService } from '../../services/enhancedExportService';
import { Button } from '../ui/Button';

interface BatchExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: LectureSession[];
  title?: string;
}

export const BatchExportModal: React.FC<BatchExportModalProps> = ({
  isOpen,
  onClose,
  sessions,
  title = 'Batch Export Lectures'
}) => {
  const [selectedSessions, setSelectedSessions] = useState<string[]>(sessions.map(s => s.id));
  const [exportOptions, setExportOptions] = useState<BatchExportOptions>({
    sessions: [],
    format: 'pdf',
    includeTimestamps: true,
    includeSummary: true,
    includeMetadata: true,
    language: 'both',
    layout: 'professional',
    includeBranding: true,
    includeWatermark: false,
    zipName: `lecture_exports_${new Date().toISOString().split('T')[0]}.zip`
  });

  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const exportService = new EnhancedExportService();

  useEffect(() => {
    exportService.setProgressCallback(setExportProgress);
  }, []);

  useEffect(() => {
    setExportOptions(prev => ({ ...prev, sessions: selectedSessions }));
  }, [selectedSessions]);

  const handleSelectAll = () => {
    setSelectedSessions(sessions.map(s => s.id));
  };

  const handleSelectNone = () => {
    setSelectedSessions([]);
  };

  const handleSessionToggle = (sessionId: string) => {
    setSelectedSessions(prev =>
      prev.includes(sessionId)
        ? prev.filter(id => id !== sessionId)
        : [...prev, sessionId]
    );
  };

  const handleBatchExport = async () => {
    if (selectedSessions.length === 0) {
      setError('Please select at least one lecture to export');
      return;
    }

    setIsExporting(true);
    setError(null);
    setExportProgress(null);

    try {
      const result = await exportService.batchExport(exportOptions);
      exportService.downloadFile(result.data, result.filename, result.mimeType);

      // Auto-close modal after successful export
      setTimeout(() => {
        onClose();
        setIsExporting(false);
        setExportProgress(null);
      }, 1500);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Batch export failed');
      setIsExporting(false);
      setExportProgress(null);
    }
  };

  const selectedSessionsData = sessions.filter(s => selectedSessions.includes(s.id));
  const totalDuration = selectedSessionsData.reduce((acc, s) => acc + s.duration, 0);
  const totalWords = selectedSessionsData.reduce((acc, s) => acc + s.wordCount, 0);
  const totalCost = selectedSessionsData.reduce((acc, s) => acc + s.cost, 0);

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-xl">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              disabled={isExporting}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Summary */}
          <div className="mt-3 text-sm text-gray-600">
            <p>{sessions.length} lectures available • {selectedSessions.length} selected</p>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Session Selection */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="block text-sm font-medium text-gray-700">
                Select Lectures to Export
              </label>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleSelectAll}
                  className="text-xs"
                >
                  Select All
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleSelectNone}
                  className="text-xs"
                >
                  Select None
                </Button>
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className={`p-4 border-b border-gray-100 last:border-b-0 ${
                    selectedSessions.includes(session.id) ? 'bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id={`session-${session.id}`}
                      checked={selectedSessions.includes(session.id)}
                      onChange={() => handleSessionToggle(session.id)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor={`session-${session.id}`} className="ml-3 flex-1 cursor-pointer">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{session.name}</p>
                          <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                            <span>⏱️ {formatDuration(session.duration)}</span>
                            <span>📝 {session.wordCount} words</span>
                            <span>🗣️ {session.language}</span>
                            <span>💰 ${session.cost.toFixed(4)}</span>
                          </div>
                        </div>
                        <div className="text-xs text-gray-400">
                          {new Date(session.startTime).toLocaleDateString()}
                        </div>
                      </div>
                    </label>
                  </div>
                </div>
              ))}
            </div>

            {/* Selection Summary */}
            {selectedSessions.length > 0 && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="text-sm font-medium text-blue-900 mb-2">Selected Lectures Summary</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-blue-600 font-medium">{selectedSessions.length}</span>
                    <div className="text-blue-700">lectures</div>
                  </div>
                  <div>
                    <span className="text-blue-600 font-medium">{formatDuration(totalDuration)}</span>
                    <div className="text-blue-700">total duration</div>
                  </div>
                  <div>
                    <span className="text-blue-600 font-medium">{totalWords.toLocaleString()}</span>
                    <div className="text-blue-700">words</div>
                  </div>
                  <div>
                    <span className="text-blue-600 font-medium">${totalCost.toFixed(4)}</span>
                    <div className="text-blue-700">total cost</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Export Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Format Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Export Format
              </label>
              <select
                value={exportOptions.format}
                onChange={(e) => setExportOptions(prev => ({ ...prev, format: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="pdf">📄 PDF Documents</option>
                <option value="docx">📝 Word Documents</option>
                <option value="txt">📃 Text Files</option>
                <option value="md">📋 Markdown Files</option>
                <option value="json">💾 JSON Data Files</option>
              </select>
            </div>

            {/* Layout Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Document Layout
              </label>
              <select
                value={exportOptions.layout}
                onChange={(e) => setExportOptions(prev => ({ ...prev, layout: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="professional">💼 Professional</option>
                <option value="academic">🎓 Academic</option>
                <option value="clean">✨ Minimal</option>
                <option value="meeting">👥 Meeting Notes</option>
              </select>
            </div>
          </div>

          {/* Archive Name */}
          <div>
            <label htmlFor="zipName" className="block text-sm font-medium text-gray-700 mb-2">
              Archive Name
            </label>
            <input
              type="text"
              id="zipName"
              value={exportOptions.zipName || ''}
              onChange={(e) => setExportOptions(prev => ({ ...prev, zipName: e.target.value }))}
              placeholder="lecture_exports.zip"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Include Options */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Include in Export
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="batch-timestamps"
                  checked={exportOptions.includeTimestamps}
                  onChange={(e) => setExportOptions(prev => ({ ...prev, includeTimestamps: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="batch-timestamps" className="ml-3 text-sm text-gray-700">
                  ⏱️ Timestamps
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="batch-summary"
                  checked={exportOptions.includeSummary}
                  onChange={(e) => setExportOptions(prev => ({ ...prev, includeSummary: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="batch-summary" className="ml-3 text-sm text-gray-700">
                  📋 Summaries
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="batch-metadata"
                  checked={exportOptions.includeMetadata}
                  onChange={(e) => setExportOptions(prev => ({ ...prev, includeMetadata: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="batch-metadata" className="ml-3 text-sm text-gray-700">
                  📊 Metadata
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="batch-branding"
                  checked={exportOptions.includeBranding}
                  onChange={(e) => setExportOptions(prev => ({ ...prev, includeBranding: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="batch-branding" className="ml-3 text-sm text-gray-700">
                  🏷️ Branding
                </label>
              </div>
            </div>
          </div>

          {/* Language Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Language Content
            </label>
            <div className="flex items-center gap-6">
              <div className="flex items-center">
                <input
                  type="radio"
                  id="batch-lang-both"
                  name="batch-language"
                  value="both"
                  checked={exportOptions.language === 'both'}
                  onChange={(e) => setExportOptions(prev => ({ ...prev, language: e.target.value as any }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <label htmlFor="batch-lang-both" className="ml-2 text-sm text-gray-700">
                  🌐 Both Languages
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="radio"
                  id="batch-lang-zh"
                  name="batch-language"
                  value="zh"
                  checked={exportOptions.language === 'zh'}
                  onChange={(e) => setExportOptions(prev => ({ ...prev, language: e.target.value as any }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <label htmlFor="batch-lang-zh" className="ml-2 text-sm text-gray-700">
                  🇭🇰 Chinese Only
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="radio"
                  id="batch-lang-en"
                  name="batch-language"
                  value="en"
                  checked={exportOptions.language === 'en'}
                  onChange={(e) => setExportOptions(prev => ({ ...prev, language: e.target.value as any }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <label htmlFor="batch-lang-en" className="ml-2 text-sm text-gray-700">
                  🇺🇸 English Only
                </label>
              </div>
            </div>
          </div>

          {/* Progress Display */}
          {exportProgress && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-700">
                  {exportProgress.message}
                </span>
                <span className="text-sm text-blue-600">
                  {exportProgress.progress}%
                </span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${exportProgress.progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm text-red-700">{error}</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 rounded-b-xl">
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-500">
              Estimated size: ~{Math.ceil((totalWords * 8) / 1024)}KB
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                onClick={onClose}
                disabled={isExporting}
                className="text-sm"
              >
                Cancel
              </Button>

              <Button
                onClick={handleBatchExport}
                disabled={isExporting || selectedSessions.length === 0}
                className="text-sm bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isExporting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Exporting {selectedSessions.length} lectures...
                  </>
                ) : (
                  `📦 Export ${selectedSessions.length} Lectures`
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};