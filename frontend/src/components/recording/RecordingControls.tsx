import React from 'react';
import { Play, Pause, Square, Mic, MicOff } from 'lucide-react';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';
import { formatDuration } from '../../utils/audioProcessor';

interface RecordingControlsProps {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  disabled?: boolean;
  className?: string;
}

export const RecordingControls: React.FC<RecordingControlsProps> = ({
  isRecording,
  isPaused,
  duration,
  onStart,
  onPause,
  onResume,
  onStop,
  disabled = false,
  className
}) => {
  const getStatusText = () => {
    if (!isRecording) return 'Ready to record';
    if (isPaused) return 'Recording paused';
    return 'Recording...';
  };

  const getStatusColor = () => {
    if (!isRecording) return 'text-gray-500';
    if (isPaused) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Status and Duration */}
      <div className="text-center space-y-2">
        <div className={cn('font-medium', getStatusColor())}>
          {getStatusText()}
        </div>
        <div className="text-2xl font-mono font-bold text-gray-800">
          {formatDuration(duration)}
        </div>
      </div>

      {/* Main Controls */}
      <div className="flex items-center justify-center space-x-4">
        {!isRecording ? (
          <Button
            size="xl"
            variant="primary"
            onClick={onStart}
            disabled={disabled}
            leftIcon={<Mic className="w-6 h-6" />}
            className="rounded-full w-20 h-20 shadow-2xl hover:scale-105 transition-transform"
          >
            <span className="sr-only">Start Recording</span>
          </Button>
        ) : (
          <>
            {/* Pause/Resume Button */}
            <Button
              size="lg"
              variant="outline"
              onClick={isPaused ? onResume : onPause}
              disabled={disabled}
              leftIcon={isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
              className="rounded-full w-16 h-16"
            >
              <span className="sr-only">{isPaused ? 'Resume' : 'Pause'}</span>
            </Button>

            {/* Stop Button */}
            <Button
              size="xl"
              variant="danger"
              onClick={onStop}
              disabled={disabled}
              leftIcon={<Square className="w-6 h-6" />}
              className="rounded-full w-20 h-20 shadow-2xl hover:scale-105 transition-transform"
            >
              <span className="sr-only">Stop Recording</span>
            </Button>
          </>
        )}
      </div>

      {/* Recording Indicator */}
      {isRecording && !isPaused && (
        <div className="flex items-center justify-center space-x-2 text-red-600">
          <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse" />
          <span className="text-sm font-medium">REC</span>
        </div>
      )}

      {/* Microphone Permission Status */}
      <div className="flex items-center justify-center text-sm text-gray-500">
        <MicOff className="w-4 h-4 mr-1" />
        <span>Microphone access required</span>
      </div>
    </div>
  );
};