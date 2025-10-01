import React, { useState, useEffect } from 'react';
import type { ExportProgress } from '../../types';
import { Button } from '../ui/Button';

interface ExportProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: string;
  serverUrl?: string;
  title?: string;
}

export const ExportProgressModal: React.FC<ExportProgressModalProps> = ({
  isOpen,
  onClose,
  jobId,
  serverUrl = 'http://localhost:3001',
  title = 'Export Progress'
}) => {
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  useEffect(() => {
    if (isOpen && jobId) {
      startPolling();
    }

    return () => {
      setIsPolling(false);
    };
  }, [isOpen, jobId]);

  const startPolling = () => {
    setIsPolling(true);
    setError(null);
    pollProgress();
  };

  const pollProgress = async () => {
    if (!isPolling) return;

    try {
      const response = await fetch(`${serverUrl}/api/export/status/${jobId}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setProgress(data);

      if (data.status === 'completed') {
        setIsPolling(false);
        // Auto-download when completed
        setTimeout(() => downloadResult(), 1000);
      } else if (data.status === 'error') {
        setIsPolling(false);
        setError(data.message || 'Export failed');
      } else {
        // Continue polling
        setTimeout(pollProgress, 1000);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch progress');
      setIsPolling(false);
    }
  };

  const downloadResult = async () => {
    try {
      const response = await fetch(`${serverUrl}/api/export/download/${jobId}`);

      if (!response.ok) {
        throw new Error('Download failed');
      }

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'export.zip';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch) {
          filename = filenameMatch[1].replace(/['"]/g, '');
        }
      }

      // Download the file
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Close modal after download
      setTimeout(() => {
        onClose();
      }, 500);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'preparing':
        return '⚙️';
      case 'processing':
        return '🔄';
      case 'generating':
        return '📄';
      case 'completed':
        return '✅';
      case 'error':
        return '❌';
      default:
        return '📊';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'processing':
      case 'generating':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const formatDuration = (startTime: number, endTime?: number) => {
    const duration = (endTime || Date.now()) - startTime;
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${seconds}s`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4 rounded-t-xl">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            {!isPolling && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        <div className="p-6">
          {/* Job ID */}
          <div className="mb-4 text-xs text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded">
            Job ID: {jobId}
          </div>

          {/* Progress Display */}
          {progress && (
            <div className={`border rounded-lg p-4 mb-4 ${getStatusColor(progress.status)}`}>
              <div className="flex items-center mb-3">
                <span className="text-2xl mr-3">{getStatusIcon(progress.status)}</span>
                <div className="flex-1">
                  <div className="font-medium capitalize">{progress.status}</div>
                  <div className="text-sm opacity-75">{progress.message}</div>
                </div>
                {progress.status !== 'error' && (
                  <div className="text-right">
                    <div className="text-lg font-bold">{progress.progress}%</div>
                  </div>
                )}
              </div>

              {/* Progress Bar */}
              {progress.status !== 'error' && (
                <div className="w-full bg-white bg-opacity-50 rounded-full h-2 mb-3">
                  <div
                    className="h-2 rounded-full transition-all duration-500 ease-out"
                    style={{
                      width: `${progress.progress}%`,
                      backgroundColor: progress.status === 'completed' ? '#10b981' : '#3b82f6'
                    }}
                  />
                </div>
              )}

              {/* Additional Info */}
              <div className="flex items-center justify-between text-xs opacity-75">
                <div>
                  {(progress as any).startTime && (
                    <span>Duration: {formatDuration((progress as any).startTime, (progress as any).endTime)}</span>
                  )}
                </div>
                {progress.fileSize && (
                  <div>
                    Size: {(progress.fileSize / 1024).toFixed(1)}KB
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <div className="font-medium text-red-800">Export Failed</div>
                  <div className="text-sm text-red-700">{error}</div>
                </div>
              </div>
            </div>
          )}

          {/* Loading State */}
          {!progress && !error && isPolling && (
            <div className="text-center py-8">
              <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-gray-600">Connecting to export service...</p>
            </div>
          )}

          {/* Status Messages */}
          {progress?.status === 'completed' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <div className="font-medium text-green-800">Export Completed!</div>
                  <div className="text-sm text-green-700">Your file is ready for download.</div>
                </div>
              </div>
            </div>
          )}

          {/* Live Updates Indicator */}
          {isPolling && (
            <div className="flex items-center justify-center text-xs text-gray-500 mb-4">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
              Live updates • Refreshing every second
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 rounded-b-xl bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-500">
              {progress?.status === 'completed' ? 'Download should start automatically' : 'Please keep this window open'}
            </div>

            <div className="flex items-center gap-3">
              {progress?.status === 'completed' && (
                <Button
                  onClick={downloadResult}
                  className="text-sm bg-green-600 hover:bg-green-700 text-white"
                >
                  📥 Download
                </Button>
              )}

              {!isPolling && (
                <Button
                  onClick={onClose}
                  variant="secondary"
                  className="text-sm"
                >
                  Close
                </Button>
              )}

              {isPolling && (
                <Button
                  onClick={() => setIsPolling(false)}
                  variant="secondary"
                  className="text-sm"
                >
                  Cancel
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};