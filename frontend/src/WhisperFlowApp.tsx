import React, { useState, useRef, useEffect } from 'react';
import { pdfBackendService } from './services/pdfBackendAPI';

type ViewMode = 'recording' | 'library' | 'billing';
type RecordingState = 'idle' | 'recording' | 'paused' | 'processing';

function WhisperFlowApp() {
  // Theme and UI state
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [currentView, setCurrentView] = useState<ViewMode>('recording');

  // Recording states - Whisper Flow style
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

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const allAudioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const streamIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processingRef = useRef(false);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

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

  // Update duration counter
  const updateDuration = () => {
    if (sessionStartTime) {
      const now = new Date();
      const diff = Math.floor((now.getTime() - sessionStartTime.getTime()) / 1000);
      setTotalDuration(diff);
    }
  };

  // Whisper Flow style processing with better UX
  const processLiveAudio = async () => {
    if (processingRef.current || allAudioChunksRef.current.length === 0) {
      return;
    }

    processingRef.current = true;
    setRecordingState('processing');

    try {
      // Whisper Flow style messages
      const messages = [
        '🎵 分析音頻中...',
        '🧠 AI 正在理解語音...',
        '✨ 生成轉錄文字...',
        '📝 整理文字格式...'
      ];

      let messageIndex = 0;
      const messageInterval = setInterval(() => {
        setProcessingMessage(messages[messageIndex]);
        messageIndex = (messageIndex + 1) % messages.length;
      }, 800);

      const audioBlob = new Blob(allAudioChunksRef.current, { type: 'audio/webm' });

      if (audioBlob.size < 8000) {
        clearInterval(messageInterval);
        setProcessingMessage('');
        setRecordingState(recordingState === 'recording' ? 'recording' : 'paused');
        processingRef.current = false;
        return;
      }

      let result;
      if (pdfContext) {
        result = await pdfBackendService.transcribeWithPdfContext(
          audioBlob,
          pdfContext.contextId
        );
      } else {
        result = await pdfBackendService.transcribeWithPdfContext(audioBlob, '');
      }

      clearInterval(messageInterval);
      setProcessingMessage('');

      // Update transcript
      setTranscript(result.text);

      // Auto-generate title from first meaningful content
      if (!currentTitle && result.text.trim().length > 15) {
        setCurrentTitle(generateTitleFromContent(result.text));
      }

      // Auto-scroll to bottom
      if (transcriptRef.current) {
        transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
      }

      // Return to previous state
      setRecordingState(recordingState === 'recording' ? 'recording' : 'paused');

    } catch (err) {
      console.error('Live processing error:', err);
      setProcessingMessage('');
      setRecordingState(recordingState === 'recording' ? 'recording' : 'paused');
    }

    processingRef.current = false;
  };

  // Start new recording session
  const startRecordingSession = async () => {
    try {
      setError('');

      // Initialize new session
      setTranscript('');
      setCurrentTitle('');
      allAudioChunksRef.current = [];
      setSessionStartTime(new Date());
      setTotalDuration(0);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          allAudioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(1000);
      setRecordingState('recording');

      // Start duration counter
      durationIntervalRef.current = setInterval(updateDuration, 1000);

      // Start live processing
      streamIntervalRef.current = setInterval(processLiveAudio, 4000);

    } catch (err) {
      setError(err instanceof Error ? err.message : '無法開始錄音');
    }
  };

  // Pause recording (not finish)
  const pauseRecording = () => {
    if (mediaRecorderRef.current && recordingState === 'recording') {
      mediaRecorderRef.current.pause();
      setRecordingState('paused');
    }
  };

  // Resume recording (same session)
  const resumeRecording = () => {
    if (mediaRecorderRef.current && recordingState === 'paused') {
      mediaRecorderRef.current.resume();
      setRecordingState('recording');
    }
  };

  // Finish entire recording session
  const finishRecording = async () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }

    if (streamIntervalRef.current) {
      clearInterval(streamIntervalRef.current);
      streamIntervalRef.current = null;
    }

    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // Final processing
    setRecordingState('processing');
    setProcessingMessage('🎯 正在完成最終轉錄...');

    await processLiveAudio();

    setRecordingState('idle');
    setProcessingMessage('');
    setSessionStartTime(null);
  };

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
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Steve Jobs + Whisper Flow theme
  const theme = {
    bg: isDarkMode ? '#000000' : '#ffffff',
    cardBg: isDarkMode ? '#1a1a1a' : '#f8f9fa',
    text: isDarkMode ? '#ffffff' : '#000000',
    textSecondary: isDarkMode ? '#888888' : '#666666',
    accent: '#007AFF',
    border: isDarkMode ? '#333333' : '#e1e5e9',
    success: '#34C759',
    danger: '#FF3B30',
    warning: '#FF9500',
    processing: '#5856D6',
  };

  const getStateColor = () => {
    switch (recordingState) {
      case 'recording': return theme.danger;
      case 'paused': return theme.warning;
      case 'processing': return theme.processing;
      default: return theme.success;
    }
  };

  const getStateText = () => {
    switch (recordingState) {
      case 'recording': return 'LIVE';
      case 'paused': return 'PAUSED';
      case 'processing': return 'AI';
      default: return 'READY';
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: theme.bg,
      color: theme.text,
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
      transition: 'all 0.2s ease'
    }}>
      {/* Enhanced Header with Whisper Flow indicators */}
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

          {/* Whisper Flow Style Status */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: getStateColor(),
              fontSize: '14px',
              fontWeight: '600'
            }}>
              <div style={{
                width: '8px',
                height: '8px',
                background: getStateColor(),
                borderRadius: '50%',
                animation: recordingState === 'recording' ? 'pulse 2s infinite' :
                          recordingState === 'processing' ? 'spin 1s linear infinite' : 'none'
              }}></div>
              {getStateText()}
            </div>

            {/* Duration Counter */}
            {sessionStartTime && (
              <div style={{
                color: theme.textSecondary,
                fontSize: '14px',
                fontWeight: '500'
              }}>
                {formatDuration(totalDuration)}
              </div>
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
          {/* Navigation */}
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

            {/* Whisper Flow Processing Indicator */}
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

              {/* Transcript */}
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
                      Click start to begin recording session
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
                  fontSize: '14px'
                }}>
                  {error}
                </div>
              )}
            </div>
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

      {/* Enhanced Control Buttons - Whisper Flow Style */}
      <div style={{
        position: 'fixed',
        bottom: '40px',
        right: '40px',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        {/* Main Action Button */}
        <button
          onClick={
            recordingState === 'idle' ? startRecordingSession :
            recordingState === 'recording' ? pauseRecording :
            recordingState === 'paused' ? resumeRecording :
            undefined
          }
          disabled={recordingState === 'processing'}
          style={{
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            background:
              recordingState === 'idle' ? theme.success :
              recordingState === 'recording' ? theme.warning :
              recordingState === 'paused' ? theme.success :
              theme.textSecondary,
            border: 'none',
            color: 'white',
            fontSize: '28px',
            cursor: recordingState === 'processing' ? 'not-allowed' : 'pointer',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: recordingState === 'processing' ? 0.6 : 1
          }}
          onMouseOver={(e) => recordingState !== 'processing' && (e.currentTarget.style.transform = 'scale(1.05)')}
          onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          {recordingState === 'idle' ? '🎙️' :
           recordingState === 'recording' ? '⏸️' :
           recordingState === 'paused' ? '▶️' :
           '⏳'}
        </button>

        {/* Finish Recording Button */}
        {recordingState !== 'idle' && (
          <button
            onClick={finishRecording}
            disabled={recordingState === 'processing'}
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: theme.danger,
              border: 'none',
              color: 'white',
              fontSize: '20px',
              cursor: recordingState === 'processing' ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: recordingState === 'processing' ? 0.6 : 1
            }}
            onMouseOver={(e) => recordingState !== 'processing' && (e.currentTarget.style.transform = 'scale(1.05)')}
            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            ⏹️
          </button>
        )}
      </div>

      {/* Enhanced CSS */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default WhisperFlowApp;