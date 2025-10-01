import React, { useState, useEffect } from 'react';
import type { LectureSession, ExportOptions, ExportProgress } from '../../types';
import { EnhancedExportService } from '../../services/enhancedExportService';
import { Button } from '../ui/Button';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: LectureSession;
  title?: string;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  session,
  title = 'Export Lecture Transcript'
}) => {
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'pdf',
    includeTimestamps: true,
    includeSummary: true,
    includeMetadata: true,
    language: 'both',
    layout: 'professional',
    includeBranding: true,
    includeWatermark: false
  });

  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const exportService = new EnhancedExportService();

  useEffect(() => {
    exportService.setProgressCallback(setExportProgress);
  }, []);

  const handleExport = async () => {
    setIsExporting(true);
    setError(null);
    setExportProgress(null);

    try {
      const result = await exportService.exportSession(session, exportOptions);
      exportService.downloadFile(result.data, result.filename, result.mimeType);

      // Auto-close modal after successful export
      setTimeout(() => {
        onClose();
        setIsExporting(false);
        setExportProgress(null);
      }, 1000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
      setIsExporting(false);
      setExportProgress(null);
    }
  };

  const handleShare = async () => {
    try {
      const success = await exportService.shareFile(session, exportOptions);
      if (!success) {
        // Fallback to generating shareable text
        const shareText = exportService.generateShareableText(session);
        if (navigator.share) {
          await navigator.share({
            title: session.name,
            text: shareText
          });
        } else {
          // Copy to clipboard
          await navigator.clipboard.writeText(shareText);
          alert('Share text copied to clipboard!');
        }
      }
    } catch (err) {
      console.error('Share failed:', err);
      setError('Sharing failed. Please try downloading instead.');
    }
  };

  const formatOptions = [
    { value: 'pdf', label: '📄 PDF', description: 'Professional document for printing and sharing' },
    { value: 'docx', label: '📝 Word Document', description: 'Editable Microsoft Word format' },
    { value: 'txt', label: '📃 Plain Text', description: 'Simple text file for basic use' },
    { value: 'md', label: '📋 Markdown', description: 'Formatted text for documentation' },
    { value: 'json', label: '💾 JSON', description: 'Structured data for developers' },
    { value: 'notion', label: '📚 Notion', description: 'Optimized for Notion workspace' },
    { value: 'gdocs', label: '📄 Google Docs', description: 'HTML format for Google Docs import' }
  ];

  const layoutOptions = [
    { value: 'professional', label: '💼 Professional', description: 'Clean corporate style' },
    { value: 'academic', label: '🎓 Academic', description: 'University paper format' },
    { value: 'clean', label: '✨ Minimal', description: 'Simple and clean design' },
    { value: 'meeting', label: '👥 Meeting Notes', description: 'Structured meeting format' }
  ];

  const languageOptions = [
    { value: 'both', label: '🌐 Both Languages', description: 'Include all content' },
    { value: 'zh', label: '🇭🇰 Chinese Only', description: 'Chinese text only' },
    { value: 'en', label: '🇺🇸 English Only', description: 'English text only' }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
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

          {/* Session Info */}
          <div className="mt-3 text-sm text-gray-600">
            <p className="font-medium">{session.name}</p>
            <p className="flex items-center gap-4 mt-1">
              <span>⏱️ {Math.floor(session.duration / 60)}m {Math.floor(session.duration % 60)}s</span>
              <span>📝 {session.wordCount} words</span>
              <span>🗣️ {session.language === 'mixed' ? '中英文' : session.language}</span>
            </p>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Export Format Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Export Format
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {formatOptions.map((format) => (
                <div key={format.value} className="relative">
                  <input
                    type="radio"
                    id={`format-${format.value}`}
                    name="format"
                    value={format.value}
                    checked={exportOptions.format === format.value}
                    onChange={(e) => setExportOptions(prev => ({ ...prev, format: e.target.value as any }))}
                    className="sr-only"
                  />
                  <label
                    htmlFor={`format-${format.value}`}
                    className={`block p-3 border rounded-lg cursor-pointer transition-all ${
                      exportOptions.format === format.value
                        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="font-medium text-sm">{format.label}</div>
                    <div className="text-xs text-gray-500 mt-1">{format.description}</div>
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Layout Selection (for PDF/HTML formats) */}
          {(exportOptions.format === 'pdf' || exportOptions.format === 'gdocs') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Document Layout
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {layoutOptions.map((layout) => (
                  <div key={layout.value} className="relative">
                    <input
                      type="radio"
                      id={`layout-${layout.value}`}
                      name="layout"
                      value={layout.value}
                      checked={exportOptions.layout === layout.value}
                      onChange={(e) => setExportOptions(prev => ({ ...prev, layout: e.target.value as any }))}
                      className="sr-only"
                    />
                    <label
                      htmlFor={`layout-${layout.value}`}
                      className={`block p-3 border rounded-lg cursor-pointer transition-all ${
                        exportOptions.layout === layout.value
                          ? 'border-green-500 bg-green-50 ring-2 ring-green-200'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="font-medium text-sm">{layout.label}</div>
                      <div className="text-xs text-gray-500 mt-1">{layout.description}</div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Language Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Language Content
            </label>
            <div className="space-y-2">
              {languageOptions.map((lang) => (
                <div key={lang.value} className="flex items-center">
                  <input
                    type="radio"
                    id={`lang-${lang.value}`}
                    name="language"
                    value={lang.value}
                    checked={exportOptions.language === lang.value}
                    onChange={(e) => setExportOptions(prev => ({ ...prev, language: e.target.value as any }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <label htmlFor={`lang-${lang.value}`} className="ml-3 flex-1">
                    <div className="text-sm font-medium text-gray-700">{lang.label}</div>
                    <div className="text-xs text-gray-500">{lang.description}</div>
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Export Options */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Include in Export
            </label>
            <div className="space-y-3">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="timestamps"
                  checked={exportOptions.includeTimestamps}
                  onChange={(e) => setExportOptions(prev => ({ ...prev, includeTimestamps: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="timestamps" className="ml-3 text-sm text-gray-700">
                  ⏱️ Timestamps <span className="text-gray-500">([00:00] markers)</span>
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="summary"
                  checked={exportOptions.includeSummary}
                  onChange={(e) => setExportOptions(prev => ({ ...prev, includeSummary: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="summary" className="ml-3 text-sm text-gray-700">
                  📋 Lecture Summary <span className="text-gray-500">(AI-generated)</span>
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="metadata"
                  checked={exportOptions.includeMetadata}
                  onChange={(e) => setExportOptions(prev => ({ ...prev, includeMetadata: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="metadata" className="ml-3 text-sm text-gray-700">
                  📊 Metadata <span className="text-gray-500">(date, duration, stats)</span>
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="branding"
                  checked={exportOptions.includeBranding}
                  onChange={(e) => setExportOptions(prev => ({ ...prev, includeBranding: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="branding" className="ml-3 text-sm text-gray-700">
                  🏷️ App Branding <span className="text-gray-500">(footer credits)</span>
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="watermark"
                  checked={exportOptions.includeWatermark}
                  onChange={(e) => setExportOptions(prev => ({ ...prev, includeWatermark: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="watermark" className="ml-3 text-sm text-gray-700">
                  💧 Watermark <span className="text-gray-500">(for sharing/distribution)</span>
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
              Export size: ~{Math.ceil((session.wordCount * 8) / 1024)}KB
            </div>

            <div className="flex items-center gap-3">
              {navigator.share && (
                <Button
                  variant="secondary"
                  onClick={handleShare}
                  disabled={isExporting}
                  className="text-sm"
                >
                  📤 Share
                </Button>
              )}

              <Button
                variant="secondary"
                onClick={onClose}
                disabled={isExporting}
                className="text-sm"
              >
                Cancel
              </Button>

              <Button
                onClick={handleExport}
                disabled={isExporting}
                className="text-sm bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isExporting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Exporting...
                  </>
                ) : (
                  '💾 Export'
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};