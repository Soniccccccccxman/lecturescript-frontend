import React, { useState, useRef, useEffect } from 'react';
import { pdfBackendService } from './services/pdfBackendAPI';

type ViewMode = 'recording' | 'library' | 'billing';
type ListeningState = 'ready' | 'recording' | 'paused';

function ContinuousCanvasApp() {
  // Theme and UI state
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [currentView, setCurrentView] = useState<ViewMode>('recording');

  // Continuous listening states
  const [listeningState, setListeningState] = useState<ListeningState>('ready');
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');
  const [currentTitle, setCurrentTitle] = useState('');

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
  const lastProcessedLengthRef = useRef(0);
  const streamRef = useRef<MediaStream | null>(null);

  // Auto-generate title from content
  const generateTitleFromContent = (text: string) => {
    const words = text.trim().split(' ');
    if (words.length > 0) {
      const preview = words.slice(0, 8).join(' ');
      const timestamp = new Date().toLocaleTimeString('zh-HK', {
        hour: '2-digit',
        minute: '2-digit'
      });
      return preview.length > 40 ? `${preview.substring(0, 40)}... (${timestamp})` : `${preview} (${timestamp})`;
    }
    return `錄音筆記 ${new Date().toLocaleTimeString('zh-HK')}`;
  };

  // Smart streaming transcription
  const processAccumulatedAudio = async () => {
    if (allAudioChunksRef.current.length <= lastProcessedLengthRef.current) {
      return;
    }

    try {
      const audioBlob = new Blob(allAudioChunksRef.current, { type: 'audio/webm' });

      if (audioBlob.size < 10000) {
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

      setTranscript(result.text);

      if (!currentTitle && result.text.trim().length > 10) {
        setCurrentTitle(generateTitleFromContent(result.text));
      }

      lastProcessedLengthRef.current = allAudioChunksRef.current.length;

      if (transcriptRef.current) {
        transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
      }
    } catch (err) {
      console.error('Smart streaming error:', err);
    }
  };

  // Initialize continuous listening when app loads
  const initializeContinuousListening = async () => {
    try {
      setError('');

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      streamRef.current = stream;
      setListeningState('ready');
    } catch (err) {
      setError(err instanceof Error ? err.message : '無法初始化麥克風');
      setListeningState('paused');
    }
  };

  // Start active recording
  const startRecording = async () => {
    if (listeningState !== 'ready' || !streamRef.current) {
      await initializeContinuousListening();
      if (!streamRef.current) return;
    }

    try {
      const mediaRecorder = new MediaRecorder(streamRef.current, {
        mimeType: 'audio/webm;codecs=opus'
      });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          allAudioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // When recording stops, go back to ready state (not paused)
        setListeningState('ready');

        // Final transcription
        if (allAudioChunksRef.current.length > 0) {
          await processAccumulatedAudio();
        }
      };

      mediaRecorder.start(1000);
      setListeningState('recording');

      // Start smart streaming
      streamIntervalRef.current = setInterval(processAccumulatedAudio, 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : '無法開始錄音');
    }
  };

  // Stop recording but stay ready
  const stopRecording = () => {
    if (mediaRecorderRef.current && listeningState === 'recording') {
      mediaRecorderRef.current.stop();

      if (streamIntervalRef.current) {
        clearInterval(streamIntervalRef.current);
        streamIntervalRef.current = null;
      }

      // Go back to ready state, keep listening
      setListeningState('ready');
    }
  };

  // Pause everything
  const pauseListening = () => {
    if (mediaRecorderRef.current && listeningState === 'recording') {
      mediaRecorderRef.current.stop();
    }

    if (streamIntervalRef.current) {
      clearInterval(streamIntervalRef.current);
      streamIntervalRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    setListeningState('paused');
  };

  // Resume to ready state
  const resumeListening = async () => {
    await initializeContinuousListening();
  };

  // Initialize on app load
  useEffect(() => {
    initializeContinuousListening();

    return () => {
      // Cleanup on unmount
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (streamIntervalRef.current) {
        clearInterval(streamIntervalRef.current);
      }
    };
  }, []);

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

  // Clean, minimal theme with state-aware colors
  const theme = {
    bg: isDarkMode ? '#0a0a0a' : '#fafafa',
    canvasBg: isDarkMode ? '#111111' : '#ffffff',
    text: isDarkMode ? '#e5e5e5' : '#1a1a1a',
    textSecondary: isDarkMode ? '#a0a0a0' : '#666666',
    accent: '#007AFF',
    border: isDarkMode ? '#333333' : '#e5e5e5',

    // State-specific colors
    ready: '#22c55e',      // Green - ready to listen
    recording: '#ef4444',   // Red - actively recording
    paused: '#6b7280',      // Gray - paused
  };

  const getStateColor = () => {
    switch (listeningState) {
      case 'ready': return theme.ready;
      case 'recording': return theme.recording;
      case 'paused': return theme.paused;
      default: return theme.accent;
    }
  };

  const getStateText = () => {
    switch (listeningState) {
      case 'ready': return '準備中';
      case 'recording': return '錄音中';
      case 'paused': return '已暫停';
      default: return '';
    }
  };

  const getStateIcon = () => {
    switch (listeningState) {
      case 'ready': return '👂';
      case 'recording': return '🎙️';
      case 'paused': return '⏸️';
      default: return '🎙️';
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: theme.bg,
      color: theme.text,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      transition: 'all 0.3s ease'
    }}>
      {/* Enhanced Header with State Indicator */}
      <header style={{
        background: theme.canvasBg,
        borderBottom: `1px solid ${theme.border}`,
        padding: '12px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <h1 style={{
            margin: 0,
            fontSize: '18px',
            fontWeight: '500',
            color: theme.text
          }}>
            LectureScript
          </h1>

          {/* State Indicator */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: `rgba(${listeningState === 'ready' ? '34, 197, 94' : listeningState === 'recording' ? '239, 68, 68' : '107, 114, 128'}, 0.1)`,
            color: getStateColor(),
            padding: '4px 12px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: '500'
          }}>
            <span>{getStateIcon()}</span>
            <span>{getStateText()}</span>
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
              PDF
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Clean Navigation */}
          <div style={{ display: 'flex', gap: '4px' }}>
            {(['recording', 'library', 'billing'] as ViewMode[]).map((view) => (
              <button
                key={view}
                onClick={() => setCurrentView(view)}
                style={{
                  padding: '8px 16px',
                  background: currentView === view ? theme.accent : 'transparent',
                  color: currentView === view ? 'white' : theme.textSecondary,
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                {view === 'recording' ? '錄製' : view === 'library' ? '資料庫' : '計費'}
              </button>
            ))}
          </div>

          {/* Minimal PDF Upload */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingPdf}
            style={{
              padding: '8px 16px',
              background: 'transparent',
              color: theme.textSecondary,
              border: `1px solid ${theme.border}`,
              borderRadius: '8px',
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
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

          {/* Theme Toggle */}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            style={{
              padding: '8px',
              background: 'transparent',
              border: `1px solid ${theme.border}`,
              borderRadius: '8px',
              color: theme.textSecondary,
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            {isDarkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      {/* Clean Canvas Content */}
      <main style={{
        maxWidth: '800px',
        margin: '0 auto',
        padding: '40px 24px',
        minHeight: 'calc(100vh - 120px)'
      }}>
        {currentView === 'recording' && (
          <div>
            {/* PDF Context - Minimal */}
            {pdfContext && (
              <div style={{
                background: theme.canvasBg,
                border: `1px solid ${theme.border}`,
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '24px'
              }}>
                <h3 style={{
                  margin: '0 0 12px 0',
                  fontSize: '16px',
                  fontWeight: '500',
                  color: theme.text
                }}>
                  {pdfContext.title}
                </h3>
                <p style={{
                  margin: 0,
                  fontSize: '14px',
                  color: theme.textSecondary,
                  lineHeight: '1.5'
                }}>
                  {pdfContext.summary}
                </p>
              </div>
            )}

            {/* Main Canvas - Clean Writing Area */}
            <div style={{
              background: theme.canvasBg,
              border: `1px solid ${theme.border}`,
              borderRadius: '12px',
              minHeight: '500px',
              position: 'relative'
            }}>
              {/* Auto-Generated Title */}
              {currentTitle && (
                <div style={{
                  padding: '20px 24px 12px 24px',
                  borderBottom: `1px solid ${theme.border}`
                }}>
                  <h2 style={{
                    margin: 0,
                    fontSize: '20px',
                    fontWeight: '600',
                    color: theme.text
                  }}>
                    {currentTitle}
                  </h2>
                </div>
              )}

              {/* Transcript Content */}
              <div style={{ padding: '24px' }}>
                {transcript ? (
                  <div
                    ref={transcriptRef}
                    style={{
                      fontSize: '16px',
                      lineHeight: '1.6',
                      whiteSpace: 'pre-wrap',
                      color: theme.text,
                      minHeight: '400px'
                    }}
                  >
                    {transcript}
                    {listeningState === 'recording' && (
                      <span style={{
                        color: theme.recording,
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
                    color: theme.textSecondary,
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '48px', marginBottom: '20px', opacity: 0.3 }}>
                      {getStateIcon()}
                    </div>
                    <h3 style={{
                      margin: '0 0 8px 0',
                      fontSize: '18px',
                      fontWeight: '500',
                      color: theme.textSecondary
                    }}>
                      {listeningState === 'ready' ? '準備聆聽' :
                       listeningState === 'recording' ? '正在錄音...' :
                       '已暫停聆聽'}
                    </h3>
                    <p style={{ margin: 0, fontSize: '14px', opacity: 0.7 }}>
                      {listeningState === 'ready' ? '開始說話即可自動錄音' :
                       listeningState === 'recording' ? '正在實時轉錄中...' :
                       '點擊恢復按鈕重新開始'}
                    </p>
                  </div>
                )}
              </div>

              {/* Minimal Error Display */}
              {error && (
                <div style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  background: '#FF3B30',
                  color: 'white',
                  padding: '8px 16px',
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
          <div style={{ textAlign: 'center', padding: '80px 0', color: theme.textSecondary }}>
            <h2 style={{ fontSize: '24px', marginBottom: '12px' }}>錄音資料庫</h2>
            <p style={{ fontSize: '16px' }}>您的錄音記錄將顯示在這裡</p>
          </div>
        )}

        {currentView === 'billing' && (
          <div style={{ textAlign: 'center', padding: '80px 0', color: theme.textSecondary }}>
            <h2 style={{ fontSize: '24px', marginBottom: '12px' }}>計費面板</h2>
            <p style={{ fontSize: '16px' }}>使用量追蹤和付款選項</p>
          </div>
        )}
      </main>

      {/* Floating Control Buttons */}
      <div style={{
        position: 'fixed',
        bottom: '32px',
        right: '32px',
        zIndex: 50,
        display: 'flex',
        gap: '16px',
        flexDirection: 'column'
      }}>
        {/* Main Action Button */}
        <button
          onClick={
            listeningState === 'ready' ? startRecording :
            listeningState === 'recording' ? stopRecording :
            resumeListening
          }
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: getStateColor(),
            border: 'none',
            color: 'white',
            fontSize: '24px',
            cursor: 'pointer',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
            transition: 'all 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          {listeningState === 'ready' ? '🎙️' :
           listeningState === 'recording' ? '⏹️' :
           '▶️'}
        </button>

        {/* Pause Button */}
        {listeningState !== 'paused' && (
          <button
            onClick={pauseListening}
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: theme.paused,
              border: 'none',
              color: 'white',
              fontSize: '16px',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            ⏸️
          </button>
        )}
      </div>

      {/* Minimal CSS */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}

export default ContinuousCanvasApp;