import React, { useState, useRef, useEffect } from 'react';
import { backendService } from './services/backendAPI';
import { IntelligentVADProcessor, createVADProcessor } from './services/vadProcessor';
import type { AudioChunk } from './services/vadProcessor';
import { UniversalAudioProcessor } from './services/audioProcessor';

type RecordingState = 'idle' | 'recording' | 'paused';

// 🍎 Steve Jobs 2025 Industrial-Grade Real-Time Transcription
function IntelligentRealtimeApp() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [transcript, setTranscript] = useState('');
  const [streamingText, setStreamingText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  // VAD Processor state
  const [rmsLevel, setRmsLevel] = useState(0);
  const [isSpeechDetected, setIsSpeechDetected] = useState(false);
  const [silenceDuration, setSilenceDuration] = useState(0);

  const vadProcessorRef = useRef<IntelligentVADProcessor | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const processedChunksRef = useRef<Set<number>>(new Set());

  // 🔥 Enhanced skeleton loading with VAD visual feedback
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
        background: isSpeechDetected ? '#10b981' : '#e1e5e9',
        borderRadius: '12px',
        animation: 'shimmer 1.5s infinite ease-in-out',
        transition: 'background-color 0.3s ease'
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

  // 🎯 Intelligent audio chunk processing
  const processAudioChunk = async (chunk: AudioChunk) => {
    const chunkId = chunk.timestamp;

    if (processedChunksRef.current.has(chunkId) || isProcessing) {
      return;
    }

    processedChunksRef.current.add(chunkId);
    setIsProcessing(true);

    try {
      console.log(`🎵 Processing intelligent chunk: ${chunk.data.size} bytes, RMS: ${chunk.rmsLevel.toFixed(4)}, Speech: ${chunk.isSpeechDetected}`);

      // Skip transcription for very low speech activity
      if (!chunk.isSpeechDetected && chunk.rmsLevel < 0.005) {
        console.log('⚠️ Skipping chunk with low speech activity');
        setIsProcessing(false);
        return;
      }

      // 🔥 Universal Audio Processing: Convert to perfect WAV
      if (!UniversalAudioProcessor.hasViableContent(chunk.data)) {
        console.log('⚠️ Skipping chunk with insufficient audio content');
        setIsProcessing(false);
        return;
      }

      const wavBlob = await UniversalAudioProcessor.convertToWAV(chunk.data);
      console.log(`🎯 Converted to WAV: ${wavBlob.size} bytes`);

      const result = await backendService.transcribeAudio(wavBlob);

      console.log(`✅ Intelligent transcription: "${result.text}"`);

      if (result.text && result.text.trim()) {
        const newText = result.text.trim();

        // Enhanced duplicate detection with fuzzy matching
        const currentTranscript = transcript.toLowerCase();
        const newTextLower = newText.toLowerCase();

        // Skip if text is too similar to recent content
        const recentWords = currentTranscript.split(' ').slice(-10).join(' ');
        const similarity = calculateSimilarity(recentWords, newTextLower);

        if (similarity < 0.8) { // Allow if less than 80% similar
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
          console.log(`⚠️ Skipping similar text: "${newText}" (similarity: ${similarity.toFixed(2)})`);
          setStreamingText('');
        }
      } else {
        setStreamingText('');
      }

    } catch (err) {
      console.error('❌ Intelligent transcription error:', err);
      setError(err instanceof Error ? err.message : 'Transcription failed');
      setStreamingText('');
    }

    setIsProcessing(false);
  };

  // Simple similarity calculation
  const calculateSimilarity = (text1: string, text2: string): number => {
    const words1 = text1.split(' ');
    const words2 = text2.split(' ');
    const commonWords = words1.filter(word => words2.includes(word));
    const totalWords = Math.max(words1.length, words2.length);
    return totalWords > 0 ? commonWords.length / totalWords : 0;
  };

  // 🚀 Start intelligent recording
  const startRecording = async () => {
    try {
      setError('');
      processedChunksRef.current.clear();

      // Initialize VAD processor with optimized settings
      vadProcessorRef.current = createVADProcessor({
        silenceThreshold: 0.01,     // 1% threshold
        silenceDuration: 2000,      // 2 seconds for lecture context
        minChunkDuration: 1500,     // 1.5 seconds minimum
        maxChunkDuration: 25000,    // 25 seconds maximum
        sampleRate: 16000           // Optimal for Whisper
      });

      await vadProcessorRef.current.initialize();

      // Real-time metrics update
      const updateMetrics = () => {
        if (vadProcessorRef.current && recordingState === 'recording') {
          const metrics = vadProcessorRef.current.getCurrentMetrics();
          setRmsLevel(metrics.rmsLevel);
          setIsSpeechDetected(!metrics.isInSilence);
          setSilenceDuration(metrics.silenceDuration);
          requestAnimationFrame(updateMetrics);
        }
      };

      await vadProcessorRef.current.startProcessing(processAudioChunk);
      setRecordingState('recording');

      updateMetrics();

      console.log('🎬 Intelligent recording started with VAD');

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start intelligent recording';
      setError(errorMessage);
      console.error('❌ Intelligent recording error:', err);
    }
  };

  // Stop intelligent recording
  const stopRecording = () => {
    if (vadProcessorRef.current) {
      vadProcessorRef.current.stop();
      vadProcessorRef.current = null;
      setRecordingState('idle');
      setRmsLevel(0);
      setIsSpeechDetected(false);
      setSilenceDuration(0);

      console.log('🛑 Intelligent recording stopped');
    }
  };

  // Theme colors with enhanced VAD feedback
  const theme = {
    bg: isDarkMode ? '#1a1a1a' : '#ffffff',
    cardBg: isDarkMode ? '#2d2d2d' : '#f8fafc',
    text: isDarkMode ? '#ffffff' : '#1f2937',
    textSecondary: isDarkMode ? '#9ca3af' : '#6b7280',
    border: isDarkMode ? '#404040' : '#e5e7eb',
    button: isDarkMode ? '#3b82f6' : '#2563eb',
    buttonHover: isDarkMode ? '#2563eb' : '#1d4ed8',
    danger: '#ef4444',
    success: '#10b981',
    warning: '#f59e0b'
  };

  // Streaming text with VAD awareness
  const StreamingText = ({ text }: { text: string }) => (
    <div style={{
      color: isSpeechDetected ? theme.success : theme.warning,
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
          🎯 Intelligent Real-Time Transcription
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

      {/* VAD Metrics Dashboard */}
      {recordingState === 'recording' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}>
          <div style={{
            padding: '16px',
            backgroundColor: theme.cardBg,
            borderRadius: '8px',
            border: `1px solid ${theme.border}`
          }}>
            <div style={{ fontSize: '14px', color: theme.textSecondary }}>RMS Level</div>
            <div style={{ fontSize: '24px', fontWeight: '600', color: rmsLevel > 0.01 ? theme.success : theme.textSecondary }}>
              {(rmsLevel * 100).toFixed(1)}%
            </div>
          </div>
          <div style={{
            padding: '16px',
            backgroundColor: theme.cardBg,
            borderRadius: '8px',
            border: `1px solid ${theme.border}`
          }}>
            <div style={{ fontSize: '14px', color: theme.textSecondary }}>Speech Status</div>
            <div style={{ fontSize: '18px', fontWeight: '600', color: isSpeechDetected ? theme.success : theme.warning }}>
              {isSpeechDetected ? '🎤 Speaking' : '🔇 Silent'}
            </div>
          </div>
          <div style={{
            padding: '16px',
            backgroundColor: theme.cardBg,
            borderRadius: '8px',
            border: `1px solid ${theme.border}`
          }}>
            <div style={{ fontSize: '14px', color: theme.textSecondary }}>Silence Duration</div>
            <div style={{ fontSize: '18px', fontWeight: '600' }}>
              {(silenceDuration / 1000).toFixed(1)}s
            </div>
          </div>
        </div>
      )}

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
            🎯 Start Intelligent Recording
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
        Status: <strong>{recordingState === 'recording' ? '🎯 Intelligent Recording...' : '⚪ Stopped'}</strong>
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
          Intelligent Live Transcript:
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
              Click "Start Intelligent Recording" to begin VAD-powered real-time transcription...
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

export default IntelligentRealtimeApp;