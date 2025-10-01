import React, { useState, useRef, useEffect } from 'react';
import { pdfBackendService } from './services/pdfBackendAPI';

type ViewMode = 'recording' | 'library' | 'billing';

function PerfectLiveApp() {
  // Theme and UI state
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [currentView, setCurrentView] = useState<ViewMode>('recording');

  // Simple states - Steve Jobs style
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [pendingText, setPendingText] = useState(''); // Text currently being processed
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
  const streamRef = useRef<MediaStream | null>(null);
  const processingRef = useRef(false);

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

  // TRUE Live streaming - process every few seconds
  const processLiveAudio = async () => {
    if (processingRef.current || allAudioChunksRef.current.length === 0) {
      return;
    }

    processingRef.current = true;

    try {
      // Show pending state
      setPendingText(' [正在處理...]');

      const audioBlob = new Blob(allAudioChunksRef.current, { type: 'audio/webm' });

      if (audioBlob.size < 8000) {
        setPendingText('');
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

      // LIVE UPDATE - Replace entire transcript with new result
      setTranscript(result.text);
      setPendingText(''); // Clear pending

      // Auto-generate title from first meaningful content
      if (!currentTitle && result.text.trim().length > 15) {
        setCurrentTitle(generateTitleFromContent(result.text));
      }

      // Auto-scroll to bottom
      if (transcriptRef.current) {
        transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
      }
    } catch (err) {
      console.error('Live processing error:', err);
      setPendingText(''); // Clear pending on error
    }

    processingRef.current = false;
  };

  // Start listening
  const startListening = async () => {
    try {
      setError('');

      // Reset everything for new session
      setTranscript('');
      setPendingText('');
      setCurrentTitle('');
      allAudioChunksRef.current = [];

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

      mediaRecorder.onstop = async () => {
        // Final processing when stopped
        await processLiveAudio();

        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };

      mediaRecorder.start(1000); // Collect data every second
      setIsListening(true);

      // Start live processing every 3 seconds
      streamIntervalRef.current = setInterval(processLiveAudio, 3000);

    } catch (err) {
      setError(err instanceof Error ? err.message : '無法開始錄音');
    }
  };

  // Stop listening
  const stopListening = () => {
    if (mediaRecorderRef.current && isListening) {
      mediaRecorderRef.current.stop();
      setIsListening(false);
    }

    if (streamIntervalRef.current) {
      clearInterval(streamIntervalRef.current);
      streamIntervalRef.current = null;
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

          {/* Simple Status */}
          {isListening && (
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

      {/* Ultra Clean Content */}
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

            {/* Main Writing Canvas */}
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
                {(transcript || pendingText) ? (
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
                    {pendingText && (
                      <span style={{
                        color: theme.textSecondary,
                        fontStyle: 'italic'
                      }}>
                        {pendingText}
                      </span>
                    )}
                    {isListening && !pendingText && (
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

      {/* Simple Floating Button */}
      <div style={{
        position: 'fixed',
        bottom: '40px',
        right: '40px',
        zIndex: 100
      }}>
        <button
          onClick={isListening ? stopListening : startListening}
          style={{
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            background: isListening ? theme.danger : theme.success,
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
          {isListening ? '⏹️' : '🎙️'}
        </button>
      </div>

      {/* Minimal CSS */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}

export default PerfectLiveApp;