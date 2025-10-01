import React, { useEffect, useRef } from 'react';
import { Copy, Download, Search } from 'lucide-react';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';
import type { TranscriptSegment } from '../../types';

interface TranscriptDisplayProps {
  segments: TranscriptSegment[];
  currentSegment?: string;
  isTranscribing?: boolean;
  onCopy?: () => void;
  onDownload?: () => void;
  onSearch?: (query: string) => void;
  className?: string;
}

export const TranscriptDisplay: React.FC<TranscriptDisplayProps> = ({
  segments,
  currentSegment = '',
  isTranscribing = false,
  onCopy,
  onDownload,
  onSearch,
  className
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = React.useState('');

  // Auto-scroll to bottom when new segments are added
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [segments.length]);

  const formatTimestamp = (timestamp: number): string => {
    const minutes = Math.floor(timestamp / 60);
    const seconds = Math.floor(timestamp % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const highlightSearchTerm = (text: string, query: string): React.ReactNode => {
    if (!query.trim()) return text;

    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, index) =>
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 px-1 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const filteredSegments = segments.filter(segment =>
    !searchQuery.trim() || segment.text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCopyAll = () => {
    const text = segments.map(segment => segment.text).join('\n\n');
    navigator.clipboard.writeText(text);
    onCopy?.();
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    onSearch?.(query);
  };

  return (
    <div className={cn('bg-white rounded-lg shadow-sm border', className)}>
      {/* Header */}
      <div className="p-4 border-b bg-gray-50 rounded-t-lg">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-800">
            Live Transcript
            {segments.length > 0 && (
              <span className="ml-2 text-sm text-gray-500">
                ({segments.length} segments)
              </span>
            )}
          </h3>
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCopyAll}
              disabled={segments.length === 0}
              leftIcon={<Copy className="w-4 h-4" />}
            >
              Copy
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onDownload}
              disabled={segments.length === 0}
              leftIcon={<Download className="w-4 h-4" />}
            >
              Export
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search transcript..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
      </div>

      {/* Transcript Content */}
      <div
        ref={scrollRef}
        className="h-96 overflow-y-auto p-4 space-y-4"
      >
        {filteredSegments.length === 0 && segments.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <div className="text-lg mb-2">Start recording to see transcript</div>
              <div className="text-sm">Audio will be transcribed in real-time</div>
            </div>
          </div>
        ) : filteredSegments.length === 0 && searchQuery ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <div className="text-lg mb-2">No results found</div>
              <div className="text-sm">Try a different search term</div>
            </div>
          </div>
        ) : (
          <>
            {filteredSegments.map((segment, index) => (
              <div
                key={segment.id}
                className={cn(
                  'p-3 rounded-lg transition-all duration-200',
                  index % 2 === 0 ? 'bg-gray-50' : 'bg-white',
                  'hover:bg-blue-50 border border-transparent hover:border-blue-200'
                )}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <span className="inline-block w-12 h-6 bg-primary-100 text-primary-700 text-xs font-mono rounded text-center leading-6">
                      {formatTimestamp(segment.timestamp)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-800 leading-relaxed">
                      {highlightSearchTerm(segment.text, searchQuery)}
                    </p>
                    {segment.confidence !== undefined && segment.confidence < 0.8 && (
                      <div className="mt-1 text-xs text-yellow-600 flex items-center">
                        <div className="w-2 h-2 bg-yellow-400 rounded-full mr-1" />
                        Low confidence transcription
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Current/Live Segment */}
            {isTranscribing && currentSegment && (
              <div className="p-3 rounded-lg bg-blue-50 border-2 border-dashed border-blue-200">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <span className="inline-block w-12 h-6 bg-blue-200 text-blue-700 text-xs font-mono rounded text-center leading-6">
                      Live
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-800 leading-relaxed">
                      {currentSegment}
                      <span className="inline-block w-2 h-5 bg-blue-500 ml-1 animate-pulse" />
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      {segments.length > 0 && (
        <div className="p-3 border-t bg-gray-50 rounded-b-lg">
          <div className="flex justify-between items-center text-sm text-gray-500">
            <span>
              {segments.reduce((acc, seg) => acc + seg.text.split(' ').length, 0)} words
            </span>
            <span>
              Last updated: {new Date().toLocaleTimeString()}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};