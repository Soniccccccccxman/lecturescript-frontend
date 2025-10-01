import React, { useState, useRef, useEffect } from 'react';
import { pdfBackendService } from './services/pdfBackendAPI';

type ViewMode = 'recording' | 'library' | 'billing';

function SmartCanvasApp() {
  // Theme and UI state
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [currentView, setCurrentView] = useState<ViewMode>('recording');

  // Recording states
  const [isRecording, setIsRecording] = useState(false);
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

  // Smart streaming transcription - only process accumulated audio
  const startSmartStreaming = async () => {
    const processAccumulatedAudio = async () => {
      // Only process if we have enough new audio data
      if (allAudioChunksRef.current.length <= lastProcessedLengthRef.current) {
        return;
      }

      try {
        // Create audio blob from ALL chunks so far
        const audioBlob = new Blob(allAudioChunksRef.current, { type: 'audio/webm' });

        // Skip if audio is too small (less than 2 seconds worth)
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

        // Replace entire transcript with new result (not append)
        setTranscript(result.text);

        // Auto-generate title from first meaningful content
        if (!currentTitle && result.text.trim().length > 10) {
          setCurrentTitle(generateTitleFromContent(result.text));
        }

        // Update processed length
        lastProcessedLengthRef.current = allAudioChunksRef.current.length;

        // Auto-scroll to bottom
        if (transcriptRef.current) {
          transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
        }
      } catch (err) {
        console.error('Smart streaming error:', err);
        // Silently fail - don't show errors to user during live recording
      }
    };

    // Process accumulated audio every 5 seconds for smooth experience
    streamIntervalRef.current = setInterval(processAccumulatedAudio, 5000);
  };

  const startRecording = async () => {
    try {
      setError('');
      setTranscript('');
      setCurrentTitle('');
      allAudioChunksRef.current = [];
      lastProcessedLengthRef.current = 0;

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          // Accumulate ALL audio chunks
          allAudioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());

        // Stop streaming interval
        if (streamIntervalRef.current) {
          clearInterval(streamIntervalRef.current);
          streamIntervalRef.current = null;
        }

        // Final transcription with all accumulated audio
        if (allAudioChunksRef.current.length > 0) {
          try {
            const finalAudioBlob = new Blob(allAudioChunksRef.current, { type: 'audio/webm' });

            let result;
            if (pdfContext) {
              result = await pdfBackendService.transcribeWithPdfContext(
                finalAudioBlob,
                pdfContext.contextId
              );
            } else {
              result = await pdfBackendService.transcribeWithPdfContext(finalAudioBlob, '');
            }

            setTranscript(result.text);

            // Generate final title if not already set
            if (!currentTitle && result.text.trim().length > 10) {
              setCurrentTitle(generateTitleFromContent(result.text));
            }
          } catch (err) {
            setError(err instanceof Error ? err.message : '最終轉錄失敗');
          }
        }
      };

      mediaRecorder.start(1000); // Collect data every 1 second
      setIsRecording(true);

      // Start smart streaming
      startSmartStreaming();
    } catch (err) {
      setError(err instanceof Error ? err.message : '無法開始錄音');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
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

  // Clean, minimal theme - focus on content
  const theme = {
    bg: isDarkMode ? '#0a0a0a' : '#fafafa',
    canvasBg: isDarkMode ? '#111111' : '#ffffff',
    text: isDarkMode ? '#e5e5e5' : '#1a1a1a',
    textSecondary: isDarkMode ? '#a0a0a0' : '#666666',
    accent: '#007AFF',
    border: isDarkMode ? '#333333' : '#e5e5e5',
    recordingAccent: isRecording ? '#FF3B30' : '#007AFF',
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: theme.bg,
      color: theme.text,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      transition: 'all 0.3s ease'
    }}>
      {/* Minimal Header */}
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
                    {isRecording && (
                      <span style={{
                        color: theme.recordingAccent,
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
                    <div style={{ fontSize: '48px', marginBottom: '20px', opacity: 0.3 }}>🎙️</div>
                    <h3 style={{
                      margin: '0 0 8px 0',
                      fontSize: '18px',
                      fontWeight: '500',
                      color: theme.textSecondary
                    }}>
                      準備開始錄音
                    </h3>
                    <p style={{ margin: 0, fontSize: '14px', opacity: 0.7 }}>
                      點擊錄音按鈕開始實時轉錄
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

      {/* Clean Floating Record Button */}
      <div style={{
        position: 'fixed',
        bottom: '32px',
        right: '32px',
        zIndex: 50
      }}>
        <button
          onClick={isRecording ? stopRecording : startRecording}
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: theme.recordingAccent,
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
          {isRecording ? '⏹️' : '🎙️'}
        </button>
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

export default SmartCanvasApp;