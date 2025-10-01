import React, { useState, useRef, useEffect } from 'react';
import { backendService } from './services/backendAPI';

type RecordingState = 'idle' | 'recording' | 'paused';

function SimpleRealtimeApp() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [transcript, setTranscript] = useState('');
  const [streamingText, setStreamingText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const streamIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // 🔥 SKELETON LOADING UI - Like your image
  const SkeletonLoading = () => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      padding: '16px 0'
    }}>
      <div style={{
        height: '20px',
        width: '80%',
        background: '#e1e5e9',
        borderRadius: '12px',
        animation: 'shimmer 1.5s infinite ease-in-out'
      }} />
      <div style={{
        height: '20px',
        width: '100%',
        background: '#e1e5e9',
        borderRadius: '12px',
        animation: 'shimmer 1.5s infinite ease-in-out',
        animationDelay: '0.1s'
      }} />
      <div style={{
        height: '20px',
        width: '60%',
        background: '#e1e5e9',
        borderRadius: '12px',
        animation: 'shimmer 1.5s infinite ease-in-out',
        animationDelay: '0.2s'
      }} />
    </div>
  );

  // 🚀 SLIDING WINDOW: Process only latest audio chunks
  const processAudioChunk = async () => {
    if (isProcessing || audioChunksRef.current.length === 0) {
      return;
    }

    // 🔥 Send individual chunks instead of combining them
    const latestChunk = audioChunksRef.current[audioChunksRef.current.length - 1];

    console.log(`🎵 Processing single latest chunk (${audioChunksRef.current.length} total)`);
    setIsProcessing(true);

    try {
      // Use individual chunk with original MIME type
      const audioBlob = latestChunk;

      console.log(`🔍 SINGLE CHUNK DEBUG:`);
      console.log(`   - Chunk size: ${audioBlob.size} bytes`);
      console.log(`   - MIME type: ${audioBlob.type}`);

      // 🔥 Use simple backend service
      const result = await backendService.transcribeAudio(audioBlob);

      console.log(`✅ New transcription: "${result.text}"`);

      if (result.text && result.text.trim()) {
        const newText = result.text.trim();

        // 🔥 Smart duplicate detection
        const currentTranscript = transcript.toLowerCase();
        const newTextLower = newText.toLowerCase();

        // Only add text if it's not already in the transcript
        if (!currentTranscript.includes(newTextLower)) {
          setStreamingText(newText);

          setTimeout(() => {
            setTranscript(prev => {
              const updated = prev ? `${prev} ${newText}` : newText;
              return updated.trim();
            });
            setStreamingText('');

            if (transcriptRef.current) {
              transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
            }
          }, 300);
        } else {
          console.log(`⚠️ Skipping duplicate text: "${newText}"`);
          setStreamingText('');
        }
      } else {
        setStreamingText('');
      }

      // 🔥 Memory management: Keep only last 5 chunks
      if (audioChunksRef.current.length > 5) {
        audioChunksRef.current = audioChunksRef.current.slice(-3);
        console.log(`🧹 Cleaned chunks, now have: ${audioChunksRef.current.length}`);
      }

    } catch (err) {
      console.error('❌ Transcription error:', err);
      setError(err instanceof Error ? err.message : 'Transcription failed');
      setStreamingText('');
    }

    setIsProcessing(false);
  };

  // Start recording with WAV format
  const startRecording = async () => {
    try {
      setError('');
      audioChunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
          channelCount: 1
        }
      });

      streamRef.current = stream;

      // 🔥 Force WAV format - most compatible with OpenAI
      let mimeType = 'audio/wav';

      // Fallback options if WAV not supported
      if (!MediaRecorder.isTypeSupported('audio/wav')) {
        if (MediaRecorder.isTypeSupported('audio/webm')) {
          mimeType = 'audio/webm';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else {
          mimeType = 'audio/webm;codecs=opus';
        }
      }

      console.log(`🎙️ Using MIME type: ${mimeType}`);

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          console.log(`📦 Audio chunk received: ${event.data.size} bytes`);
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error('❌ MediaRecorder error:', event);
        setError('Recording error occurred');
      };

      // 🔥 Steve Jobs Solution: Variable chunk timing to prevent duplicate sizes
      const randomChunkSize = 1800 + Math.random() * 400; // 1.8-2.2 seconds
      mediaRecorder.start(randomChunkSize);
      setRecordingState('recording');

      // Process chunks with variable timing
      const randomProcessInterval = 2800 + Math.random() * 400; // 2.8-3.2 seconds
      streamIntervalRef.current = setInterval(processAudioChunk, randomProcessInterval);

      console.log('🎬 Recording started with WAV format');

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start recording';
      setError(errorMessage);
      console.error('❌ Start recording error:', err);
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setRecordingState('idle');

      if (streamIntervalRef.current) {
        clearInterval(streamIntervalRef.current);
        streamIntervalRef.current = null;
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }

      console.log('🛑 Recording stopped');
    }
  };

  // Theme colors
  const theme = {
    bg: isDarkMode ? '#1a1a1a' : '#ffffff',
    cardBg: isDarkMode ? '#2d2d2d' : '#f8fafc',
    text: isDarkMode ? '#ffffff' : '#1f2937',
    textSecondary: isDarkMode ? '#9ca3af' : '#6b7280',
    border: isDarkMode ? '#404040' : '#e5e7eb',
    button: isDarkMode ? '#3b82f6' : '#2563eb',
    buttonHover: isDarkMode ? '#2563eb' : '#1d4ed8',
    danger: '#ef4444',
    success: '#10b981'
  };

  // Streaming text with typing effect
  const StreamingText = ({ text }: { text: string }) => (
    <div style={{
      color: theme.success,
      fontStyle: 'italic',
      opacity: 0.8,
      animation: 'pulse 1s infinite',
      minHeight: '24px'
    }}>
      {text && `✨ ${text}...`}
    </div>
  );

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: theme.bg,
      color: theme.text,
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        padding: '16px',
        backgroundColor: theme.cardBg,
        borderRadius: '12px',
        border: `1px solid ${theme.border}`
      }}>
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '600' }}>
          🎙️ Real-Time Transcription
        </h1>
        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          style={{
            padding: '8px 16px',
            backgroundColor: theme.button,
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          {isDarkMode ? '☀️ Light' : '🌙 Dark'}
        </button>
      </div>

      {/* Controls */}
      <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '24px',
        justifyContent: 'center'
      }}>
        {recordingState === 'idle' && (
          <button
            onClick={startRecording}
            style={{
              padding: '12px 24px',
              backgroundColor: theme.success,
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '500'
            }}
          >
            🎤 Start Recording
          </button>
        )}

        {recordingState === 'recording' && (
          <button
            onClick={stopRecording}
            style={{
              padding: '12px 24px',
              backgroundColor: theme.danger,
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '500'
            }}
          >
            🛑 Stop Recording
          </button>
        )}
      </div>

      {/* Status */}
      <div style={{
        textAlign: 'center',
        marginBottom: '24px',
        color: theme.textSecondary
      }}>
        Status: <strong>{recordingState === 'recording' ? '🔴 Recording...' : '⚪ Stopped'}</strong>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          padding: '12px 16px',
          backgroundColor: '#fef2f2',
          color: theme.danger,
          borderRadius: '8px',
          marginBottom: '24px',
          border: `1px solid #fecaca`
        }}>
          ❌ {error}
        </div>
      )}

      {/* Transcript */}
      <div style={{
        backgroundColor: theme.cardBg,
        border: `1px solid ${theme.border}`,
        borderRadius: '12px',
        padding: '20px',
        minHeight: '300px',
        maxHeight: '500px',
        overflow: 'auto'
      }}>
        <h3 style={{
          margin: '0 0 16px 0',
          fontSize: '18px',
          fontWeight: '600'
        }}>
          Live Transcript:
        </h3>

        <div
          ref={transcriptRef}
          style={{
            lineHeight: '1.6',
            fontSize: '16px',
            minHeight: '200px'
          }}
        >
          {transcript && <div style={{ marginBottom: '12px' }}>{transcript}</div>}

          {isProcessing ? (
            <SkeletonLoading />
          ) : (
            <StreamingText text={streamingText} />
          )}

          {!transcript && !streamingText && !isProcessing && (
            <div style={{
              color: theme.textSecondary,
              fontStyle: 'italic',
              textAlign: 'center',
              padding: '40px 20px'
            }}>
              Click "Start Recording" to begin real-time transcription...
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes shimmer {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }

        @keyframes pulse {
          0%, 100% { opacity: 0.8; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export default SimpleRealtimeApp;