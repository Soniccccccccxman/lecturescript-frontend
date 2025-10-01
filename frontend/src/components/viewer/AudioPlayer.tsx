// 🎵 LectureScript - Audio Player Component
// Apple-style audio player with transcript sync
// Author: Peter Levler

import React, { useState, useRef, useEffect } from 'react';
import type { AudioFile } from '../../types/upload';
import type { TranscriptionSegment } from '../../types/transcription';

interface AudioPlayerProps {
  audioFile: AudioFile | null;
  transcription: TranscriptionSegment[];
  onTimeUpdate?: (currentTime: number, currentSegment: TranscriptionSegment | null) => void;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  audioFile,
  transcription,
  onTimeUpdate,
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);

  /**
   * Format time in MM:SS format
   */
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  /**
   * Handle play/pause toggle
   */
  const togglePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  /**
   * Handle time update from audio element
   */
  const handleTimeUpdate = () => {
    if (!audioRef.current) return;

    const time = audioRef.current.currentTime;
    setCurrentTime(time);

    // Find current segment
    const currentSegment = transcription.find(
      seg => time >= seg.start && time < seg.end
    );

    // Notify parent component
    if (onTimeUpdate) {
      onTimeUpdate(time, currentSegment || null);
    }
  };

  /**
   * Handle audio loaded metadata
   */
  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  /**
   * Seek to specific time
   */
  const seekTo = (time: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = time;
    setCurrentTime(time);
  };

  /**
   * Handle progress bar click
   */
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * duration;
    seekTo(newTime);
  };

  /**
   * Skip forward/backward
   */
  const skip = (seconds: number) => {
    const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
    seekTo(newTime);
  };

  /**
   * Handle volume change
   */
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  // Expose audioRef to parent component via forwarding
  useEffect(() => {
    if (audioRef.current && onTimeUpdate) {
      // Attach custom seekTo method
      (audioRef.current as any).seekTo = seekTo;
    }
  }, [seekTo]);

  if (!audioFile?.url) {
    return null;
  }

  return (
    <div
      className="glass elevation-2"
      style={{
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'var(--blur-md)',
        borderTop: '1px solid var(--border-primary)',
        padding: 'var(--space-md) var(--space-lg)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-sm)',
      }}
    >
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={audioFile.url}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
      />

      {/* Audio info */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-sm)',
        marginBottom: 'var(--space-xs)',
      }}>
        <span style={{ fontSize: 'var(--text-base)' }}>🎵</span>
        <span style={{
          fontSize: 'var(--text-sm)',
          fontWeight: 'var(--font-medium)',
          color: 'var(--text-primary)',
          flex: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {audioFile.name}
        </span>
        <span style={{
          fontSize: 'var(--text-xs)',
          color: 'var(--text-tertiary)',
          fontWeight: 'var(--font-medium)',
        }}>
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>

      {/* Progress bar */}
      <div
        onClick={handleProgressClick}
        style={{
          height: '6px',
          backgroundColor: 'var(--color-gray-200)',
          borderRadius: 'var(--radius-full)',
          cursor: 'pointer',
          position: 'relative',
          marginBottom: 'var(--space-xs)',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
            backgroundColor: 'var(--color-primary)',
            borderRadius: 'var(--radius-full)',
            transition: 'width 0.1s linear',
          }}
        />
      </div>

      {/* Controls */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--space-md)',
      }}>
        {/* Skip backward 10s */}
        <button
          onClick={() => skip(-10)}
          className="focus-ring transition-smooth"
          style={{
            padding: 'var(--space-sm)',
            fontSize: 'var(--text-sm)',
            color: 'var(--text-primary)',
            backgroundColor: 'transparent',
            border: '1px solid var(--border-secondary)',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-xs)',
          }}
          title="Backward 10 seconds"
        >
          ⏪ 10s
        </button>

        {/* Play/Pause button */}
        <button
          onClick={togglePlayPause}
          className="focus-ring transition-spring"
          style={{
            width: '48px',
            height: '48px',
            fontSize: '20px',
            color: 'white',
            backgroundColor: 'var(--color-primary)',
            border: 'none',
            borderRadius: '50%',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--shadow-md)',
          }}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? '⏸️' : '▶️'}
        </button>

        {/* Skip forward 10s */}
        <button
          onClick={() => skip(10)}
          className="focus-ring transition-smooth"
          style={{
            padding: 'var(--space-sm)',
            fontSize: 'var(--text-sm)',
            color: 'var(--text-primary)',
            backgroundColor: 'transparent',
            border: '1px solid var(--border-secondary)',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-xs)',
          }}
          title="Forward 10 seconds"
        >
          10s ⏩
        </button>

        {/* Volume control */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-sm)',
          marginLeft: 'auto',
        }}>
          <span style={{ fontSize: 'var(--text-base)' }}>
            {volume > 0.5 ? '🔊' : volume > 0 ? '🔉' : '🔇'}
          </span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={handleVolumeChange}
            style={{
              width: '80px',
              cursor: 'pointer',
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default AudioPlayer;
