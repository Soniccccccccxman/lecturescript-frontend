import React, { useState, useRef, useEffect } from 'react';
import { pdfBackendService } from './services/pdfBackendAPI';

type ViewMode = 'recording' | 'library' | 'billing';
type RecordingState = 'idle' | 'recording' | 'paused' | 'processing';

function PerfectLiveTranscriptApp() {
  // Theme and UI state
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [currentView, setCurrentView] = useState<ViewMode>('recording');

  // Recording states - FIXED VERSION
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');
  const [currentTitle, setCurrentTitle] = useState('');
  const [processingMessage, setProcessingMessage] = useState('');

  // Session tracking
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [totalDuration, setTotalDuration] = useState(0);

  // PDF states
  const [pdfContext, setPdfContext] = useState<{
    contextId: string;
    title: string;
    summary: string;
    pageCount: number;
  } | null>(null);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);

  // Refs - CRITICAL FIXES
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const unprocessedChunksRef = useRef<Blob[]>([]); // 🔥 FIX: Only unprocessed chunks
  const fileInputRef = useRef<HTMLInputElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const streamIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processingRef = useRef(false);
  const processingTimeoutRef = useRef<NodeJS.Timeout | null>(null); // 🔥 FIX: Timeout protection
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastProcessedChunkCount = useRef(0); // 🔥 FIX: Track processed chunks

  // Duration counter
  useEffect(() => {
    if (recordingState === 'recording' || recordingState === 'processing') {
      durationIntervalRef.current = setInterval(() => {
        updateDuration();
      }, 1000);
    } else {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
    }

    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, [recordingState, sessionStartTime]);

  const updateDuration = () => {
    if (sessionStartTime) {
      const now = new Date();
      const diff = Math.floor((now.getTime() - sessionStartTime.getTime()) / 1000);
      setTotalDuration(diff);
    }
  };

  // Auto-generate title from content
  const generateTitleFromContent = (text: string) => {
    const words = text.trim().split(' ');
    if (words.length > 0) {
      const preview = words.slice(0, 6).join(' ');
      const timestamp = new Date().toLocaleTimeString('zh-HK', {
        hour: '2-digit',
        minute: '2-digit'
      });
      return preview.length > 30 ? `${preview.substring(0, 30)}... (${timestamp})` : `${preview} (${timestamp})`;
    }
    return `錄音筆記 ${new Date().toLocaleTimeString('zh-HK')}`;
  };

  // 🔥 COMPLETELY FIXED AUDIO PROCESSING
  const processNewAudio = async () => {
    // 🔥 FIX: Early exit conditions with proper checks
    if (processingRef.current) {
      console.log('🚫 Processing already in progress, skipping...');
      return;
    }

    const newChunksCount = unprocessedChunksRef.current.length;
    if (newChunksCount === 0 || newChunksCount <= lastProcessedChunkCount.current) {
      console.log('🚫 No new audio chunks to process');
      return;
    }

    console.log(`🎵 Processing ${newChunksCount} new audio chunks`);

    processingRef.current = true;

    // 🔥 FIX: Use functional state update to avoid stale closure
    setRecordingState(currentState => {
      if (currentState === 'idle') return 'idle';
      return 'processing';
    });

    try {
      // 🔥 FIX: AudioPen-style processing indicators
      const audioPenMessages = [
        '🎙️ 聆聽中...',
        '🧠 理解語言...',
        '💬 轉換文字...',
        '✨ 優化內容...'
      ];

      let messageIndex = 0;
      setProcessingMessage(audioPenMessages[0]);

      const messageInterval = setInterval(() => {
        messageIndex = (messageIndex + 1) % audioPenMessages.length;
        setProcessingMessage(audioPenMessages[messageIndex]);
      }, 1200); // 🔥 FIX: Slower, more natural rotation

      // 🔥 FIX: Processing timeout protection
      processingTimeoutRef.current = setTimeout(() => {
        console.warn('⚠️ Processing timeout - resetting state');
        clearInterval(messageInterval);
        setProcessingMessage('');
        processingRef.current = false;
        setRecordingState(prev => prev === 'processing' ? 'recording' : prev);
      }, 30000);

      // 🔥 FIX: Only process NEW unprocessed chunks
      const newAudioBlob = new Blob(unprocessedChunksRef.current, { type: 'audio/webm' });

      console.log(`🎵 Processing audio blob: ${newAudioBlob.size} bytes`);

      // 🔥 FIX: Skip if audio too small (silence/noise)
      if (newAudioBlob.size < 8000) {
        console.log('🚫 Audio blob too small, skipping...');
        clearInterval(messageInterval);
        clearTimeout(processingTimeoutRef.current!);
        setProcessingMessage('');
        processingRef.current = false;
        return;
      }

      // 🔥 FIX: Clear chunks BEFORE processing to avoid reprocessing
      const chunksToProcess = unprocessedChunksRef.current.length;
      unprocessedChunksRef.current = []; // Clear immediately
      lastProcessedChunkCount.current = 0; // Reset counter

      let result;
      if (pdfContext) {
        result = await pdfBackendService.transcribeWithPdfContext(
          newAudioBlob,
          pdfContext.contextId
        );
      } else {
        result = await pdfBackendService.transcribeWithPdfContext(newAudioBlob, '');
      }

      // 🔥 FIX: Clear processing indicators
      clearInterval(messageInterval);
      clearTimeout(processingTimeoutRef.current!);
      setProcessingMessage('');

      console.log(`✅ Transcription result: "${result.text}"`);

      // 🔥 FIX: APPEND new transcript instead of replacing
      if (result.text && result.text.trim()) {
        setTranscript(prev => {
          const newText = prev ? `${prev} ${result.text}` : result.text;
          console.log(`📝 Updated transcript: "${newText}"`);
          return newText;
        });

        // Auto-generate title from first meaningful content
        if (!currentTitle && result.text.trim().length > 15) {
          setCurrentTitle(generateTitleFromContent(result.text));
        }

        // Auto-scroll to bottom
        if (transcriptRef.current) {
          transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
        }
      }

      // 🔥 FIX: Return to previous recording state
      setRecordingState(currentState => {
        if (currentState === 'processing') return 'recording';
        return currentState;
      });

    } catch (err) {
      console.error('❌ Processing error:', err);

      // 🔥 FIX: Restore chunks on error to retry later
      const errorMessage = err instanceof Error ? err.message : 'Processing failed';
      setError(errorMessage);

      // Clear processing state
      setProcessingMessage('');
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
      }

      setRecordingState(currentState =>
        currentState === 'processing' ? 'recording' : currentState
      );
    }

    processingRef.current = false;
  };

  // Start new recording session
  const startRecordingSession = async () => {
    try {
      setError('');

      // Reset everything for new session
      setTranscript('');
      setProcessingMessage('');
      setCurrentTitle('');
      unprocessedChunksRef.current = []; // 🔥 FIX: Clear unprocessed chunks
      lastProcessedChunkCount.current = 0;

      // 🔥 FIX: Enhanced audio constraints
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100, // 🔥 FIX: Consistent sample rate
          channelCount: 1 // 🔥 FIX: Mono for better compression
        }
      });

      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      mediaRecorderRef.current = mediaRecorder;

      // 🔥 FIX: Proper chunk handling
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          console.log(`🎤 New audio chunk: ${event.data.size} bytes`);
          unprocessedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        console.log('🛑 MediaRecorder stopped, processing final audio...');
        // 🔥 FIX: Process any remaining chunks
        if (unprocessedChunksRef.current.length > 0) {
          await processNewAudio();
        }

        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };

      // 🔥 FIX: 3-second chunks for better processing
      mediaRecorder.start(3000);
      setRecordingState('recording');
      setSessionStartTime(new Date());

      // 🔥 FIX: Process new audio every 6 seconds to allow for chunk accumulation
      streamIntervalRef.current = setInterval(processNewAudio, 6000);

      console.log('🎬 Recording session started');

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '無法開始錄音';
      setError(errorMessage);
      console.error('❌ Start recording error:', err);
    }
  };

  // Pause recording (keep session alive)
  const pauseRecording = () => {
    if (mediaRecorderRef.current && recordingState === 'recording') {
      console.log('⏸️ Pausing recording...');
      mediaRecorderRef.current.pause();
      setRecordingState('paused');
    }
  };

  // Resume recording
  const resumeRecording = () => {
    if (mediaRecorderRef.current && recordingState === 'paused') {
      console.log('▶️ Resuming recording...');
      mediaRecorderRef.current.resume();
      setRecordingState('recording');
    }
  };

  // Finish entire recording session
  const finishRecordingSession = () => {
    console.log('🏁 Finishing recording session...');

    if (mediaRecorderRef.current && (recordingState === 'recording' || recordingState === 'paused')) {
      mediaRecorderRef.current.stop();
      setRecordingState('idle');
    }

    // 🔥 FIX: Clean up intervals properly
    if (streamIntervalRef.current) {
      clearInterval(streamIntervalRef.current);
      streamIntervalRef.current = null;
    }

    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    console.log('✅ Recording session finished');
  };

  // PDF file handling
  const processPdfFile = async (file: File) => {
    try {
      setIsUploadingPdf(true);
      setError('');

      const result = await pdfBackendService.uploadPdf(file);

      setPdfContext({
        contextId: result.contextId,
        title: result.title,
        summary: result.summary,
        pageCount: result.pageCount,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PDF上傳失敗');
    } finally {
      setIsUploadingPdf(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processPdfFile(file);
    }
  };

  // Format duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Steve Jobs clean theme
  const theme = {
    bg: isDarkMode ? '#000000' : '#ffffff',
    cardBg: isDarkMode ? '#1a1a1a' : '#f8f9fa',
    text: isDarkMode ? '#ffffff' : '#000000',
    textSecondary: isDarkMode ? '#888888' : '#666666',
    accent: '#007AFF',
    border: isDarkMode ? '#333333' : '#e1e5e9',
    success: '#34C759',
    danger: '#FF3B30',
    processing: '#FF9500', // Orange for processing
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: theme.bg,
      color: theme.text,
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
      transition: 'all 0.2s ease'
    }}>
      {/* Ultra Clean Header */}
      <header style={{
        background: theme.cardBg,
        borderBottom: `1px solid ${theme.border}`,
        padding: '16px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <h1 style={{
            margin: 0,
            fontSize: '20px',
            fontWeight: '600',
            color: theme.text
          }}>
            LectureScript
          </h1>

          {/* Enhanced Status Display */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {recordingState === 'recording' && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: theme.danger,
                fontSize: '14px',
                fontWeight: '500'
              }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  background: theme.danger,
                  borderRadius: '50%',
                  animation: 'pulse 2s infinite'
                }}></div>
                LIVE
              </div>
            )}

            {recordingState === 'paused' && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: theme.processing,
                fontSize: '14px',
                fontWeight: '500'
              }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  background: theme.processing,
                  borderRadius: '50%'
                }}></div>
                PAUSED
              </div>
            )}

            {recordingState === 'processing' && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: theme.processing,
                fontSize: '14px',
                fontWeight: '500'
              }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  background: theme.processing,
                  borderRadius: '50%',
                  animation: 'pulse 1s infinite'
                }}></div>
                AI
              </div>
            )}

            {/* Duration Counter */}
            {(recordingState === 'recording' || recordingState === 'paused' || recordingState === 'processing') && (
              <span style={{
                color: theme.textSecondary,
                fontSize: '14px',
                fontWeight: '500'
              }}>
                {formatDuration(totalDuration)}
              </span>
            )}
          </div>

          {pdfContext && (
            <span style={{
              background: theme.accent,
              color: 'white',
              padding: '4px 12px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: '500'
            }}>
              PDF Enhanced
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Simple Navigation */}
          {(['recording', 'library', 'billing'] as ViewMode[]).map((view) => (
            <button
              key={view}
              onClick={() => setCurrentView(view)}
              style={{
                padding: '8px 16px',
                background: currentView === view ? theme.accent : 'transparent',
                color: currentView === view ? 'white' : theme.textSecondary,
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              {view === 'recording' ? '錄製' : view === 'library' ? '資料庫' : '計費'}
            </button>
          ))}

          {/* PDF Upload */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingPdf}
            style={{
              padding: '8px 16px',
              background: 'transparent',
              color: theme.textSecondary,
              border: `1px solid ${theme.border}`,
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            {isUploadingPdf ? '上傳中...' : '+ PDF'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />

          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            style={{
              padding: '8px',
              background: 'transparent',
              border: `1px solid ${theme.border}`,
              borderRadius: '6px',
              color: theme.textSecondary,
              cursor: 'pointer'
            }}
          >
            {isDarkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main style={{
        maxWidth: '900px',
        margin: '0 auto',
        padding: '40px 24px'
      }}>
        {currentView === 'recording' && (
          <div>
            {/* PDF Context */}
            {pdfContext && (
              <div style={{
                background: theme.cardBg,
                border: `1px solid ${theme.border}`,
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '24px'
              }}>
                <h3 style={{
                  margin: '0 0 8px 0',
                  fontSize: '16px',
                  fontWeight: '600'
                }}>
                  {pdfContext.title}
                </h3>
                <p style={{
                  margin: 0,
                  fontSize: '14px',
                  color: theme.textSecondary,
                  lineHeight: '1.4'
                }}>
                  {pdfContext.summary}
                </p>
              </div>
            )}

            {/* AudioPen-style Processing Indicator */}
            {processingMessage && (
              <div style={{
                background: `linear-gradient(135deg, ${theme.processing}15, ${theme.processing}05)`,
                border: `1px solid ${theme.processing}30`,
                borderRadius: '12px',
                padding: '16px 20px',
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                color: theme.processing
              }}>
                <div style={{
                  width: '20px',
                  height: '20px',
                  border: `2px solid ${theme.processing}`,
                  borderTop: '2px solid transparent',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></div>
                <span style={{ fontSize: '16px', fontWeight: '500' }}>{processingMessage}</span>
              </div>
            )}

            {/* Main Canvas */}
            <div style={{
              background: theme.cardBg,
              border: `1px solid ${theme.border}`,
              borderRadius: '12px',
              minHeight: '600px',
              position: 'relative'
            }}>
              {/* Title */}
              {currentTitle && (
                <div style={{
                  padding: '24px 24px 16px 24px',
                  borderBottom: `1px solid ${theme.border}`
                }}>
                  <h2 style={{
                    margin: 0,
                    fontSize: '24px',
                    fontWeight: '700'
                  }}>
                    {currentTitle}
                  </h2>
                </div>
              )}

              {/* Live Transcript */}
              <div style={{ padding: '24px' }}>
                {transcript ? (
                  <div
                    ref={transcriptRef}
                    style={{
                      fontSize: '18px',
                      lineHeight: '1.7',
                      whiteSpace: 'pre-wrap',
                      minHeight: '400px'
                    }}
                  >
                    {transcript}
                    {recordingState === 'recording' && (
                      <span style={{
                        color: theme.danger,
                        animation: 'pulse 1.5s infinite'
                      }}>|</span>
                    )}
                  </div>
                ) : (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '400px',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '64px', marginBottom: '24px', opacity: 0.3 }}>🎙️</div>
                    <h3 style={{
                      margin: '0 0 12px 0',
                      fontSize: '24px',
                      fontWeight: '600'
                    }}>
                      Ready to Listen
                    </h3>
                    <p style={{
                      margin: 0,
                      fontSize: '16px',
                      color: theme.textSecondary
                    }}>
                      Click the microphone to start live transcription
                    </p>
                  </div>
                )}
              </div>

              {/* Error */}
              {error && (
                <div style={{
                  position: 'absolute',
                  top: '20px',
                  right: '20px',
                  background: theme.danger,
                  color: 'white',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  maxWidth: '300px',
                  zIndex: 10
                }}>
                  {error}
                </div>
              )}
            </div>

            {/* Control Buttons */}
            {(recordingState === 'recording' || recordingState === 'paused') && (
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '16px',
                marginTop: '24px'
              }}>
                <button
                  onClick={recordingState === 'recording' ? pauseRecording : resumeRecording}
                  disabled={recordingState === 'processing'}
                  style={{
                    padding: '12px 24px',
                    background: theme.processing,
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '500',
                    cursor: recordingState === 'processing' ? 'not-allowed' : 'pointer',
                    opacity: recordingState === 'processing' ? 0.5 : 1
                  }}
                >
                  {recordingState === 'recording' ? '⏸️ 暫停' : '▶️ 繼續'}
                </button>

                <button
                  onClick={finishRecordingSession}
                  disabled={recordingState === 'processing'}
                  style={{
                    padding: '12px 24px',
                    background: theme.danger,
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '500',
                    cursor: recordingState === 'processing' ? 'not-allowed' : 'pointer',
                    opacity: recordingState === 'processing' ? 0.5 : 1
                  }}
                >
                  🏁 完成錄音
                </button>
              </div>
            )}
          </div>
        )}

        {currentView === 'library' && (
          <div style={{ textAlign: 'center', padding: '100px 0' }}>
            <h2 style={{ fontSize: '32px', marginBottom: '16px' }}>錄音資料庫</h2>
            <p style={{ fontSize: '18px', color: theme.textSecondary }}>您的錄音記錄將顯示在這裡</p>
          </div>
        )}

        {currentView === 'billing' && (
          <div style={{ textAlign: 'center', padding: '100px 0' }}>
            <h2 style={{ fontSize: '32px', marginBottom: '16px' }}>計費面板</h2>
            <p style={{ fontSize: '18px', color: theme.textSecondary }}>使用量追蹤和付款選項</p>
          </div>
        )}
      </main>

      {/* Floating Action Button - Only show when idle */}
      {recordingState === 'idle' && (
        <div style={{
          position: 'fixed',
          bottom: '40px',
          right: '40px',
          zIndex: 100
        }}>
          <button
            onClick={startRecordingSession}
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              background: theme.success,
              border: 'none',
              color: 'white',
              fontSize: '28px',
              cursor: 'pointer',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            🎙️
          </button>
        </div>
      )}

      {/* Enhanced CSS with AudioPen-style animations */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default PerfectLiveTranscriptApp;