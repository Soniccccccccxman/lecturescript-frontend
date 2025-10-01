import React, { useState, useRef, useEffect } from 'react';
import { pdfBackendService } from './services/pdfBackendAPI';

type ViewMode = 'recording' | 'library' | 'billing';

function ModernIntegratedApp() {
  // Theme and UI state
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [currentView, setCurrentView] = useState<ViewMode>('recording');

  // Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState('');

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
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);

  const startRecording = async () => {
    try {
      setError('');
      setLiveTranscript('');

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
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

        try {
          setIsTranscribing(true);
          let result;
          if (pdfContext) {
            result = await pdfBackendService.transcribeWithPdfContext(
              audioBlob,
              pdfContext.contextId
            );
          } else {
            result = await pdfBackendService.transcribeWithPdfContext(audioBlob, '');
          }
          setLiveTranscript(result.text);
        } catch (err) {
          setError(err instanceof Error ? err.message : '轉錄失敗');
        } finally {
          setIsTranscribing(false);
        }

        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
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

  // Modern theme
  const theme = {
    bg: isDarkMode ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
    cardBg: isDarkMode ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255, 255, 255, 0.9)',
    text: isDarkMode ? '#f8fafc' : '#1e293b',
    textSecondary: isDarkMode ? '#94a3b8' : '#64748b',
    accent: '#6366f1',
    accentHover: '#4f46e5',
    border: isDarkMode ? 'rgba(148, 163, 184, 0.2)' : 'rgba(100, 116, 139, 0.2)',
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: theme.bg,
      color: theme.text,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Header */}
      <header style={{
        background: 'rgba(0, 0, 0, 0.1)',
        backdropFilter: 'blur(20px)',
        borderBottom: `1px solid ${theme.border}`,
        padding: '1rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '32px',
            height: '32px',
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 'bold'
          }}>
            L
          </div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '600' }}>LectureScript Pro</h1>
          {pdfContext && (
            <span style={{
              background: 'rgba(34, 197, 94, 0.2)',
              color: '#22c55e',
              padding: '0.25rem 0.75rem',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: '500'
            }}>
              PDF Enhanced
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {/* Navigation */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {(['recording', 'library', 'billing'] as ViewMode[]).map((view) => (
              <button
                key={view}
                onClick={() => setCurrentView(view)}
                style={{
                  padding: '0.5rem 1rem',
                  background: currentView === view ? theme.accent : 'transparent',
                  color: currentView === view ? 'white' : theme.textSecondary,
                  border: 'none',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                {view === 'recording' ? '🎙️ 錄製' : view === 'library' ? '📚 資料庫' : '💳 計費'}
              </button>
            ))}
          </div>

          {/* PDF Upload */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingPdf}
            style={{
              padding: '0.5rem 1rem',
              background: 'rgba(139, 92, 246, 0.2)',
              color: '#8b5cf6',
              border: `1px solid rgba(139, 92, 246, 0.3)`,
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
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
              padding: '0.5rem',
              background: 'transparent',
              border: `1px solid ${theme.border}`,
              borderRadius: '0.5rem',
              color: theme.text,
              cursor: 'pointer',
              fontSize: '1rem'
            }}
          >
            {isDarkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ padding: '2rem' }}>
        {currentView === 'recording' && (
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            {/* PDF Context Panel */}
            {pdfContext && (
              <div style={{
                background: theme.cardBg,
                backdropFilter: 'blur(20px)',
                borderRadius: '1rem',
                padding: '1.5rem',
                marginBottom: '2rem',
                border: `1px solid ${theme.border}`
              }}>
                <h3 style={{ margin: '0 0 1rem 0', color: theme.accent }}>📄 PDF Context</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  <div>
                    <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.875rem', color: theme.textSecondary }}>Title:</p>
                    <p style={{ margin: 0, fontWeight: '500' }}>{pdfContext.title}</p>
                  </div>
                  <div>
                    <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.875rem', color: theme.textSecondary }}>Pages:</p>
                    <p style={{ margin: 0, fontWeight: '500' }}>{pdfContext.pageCount}</p>
                  </div>
                </div>
                <div style={{ marginTop: '1rem' }}>
                  <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', color: theme.textSecondary }}>Summary:</p>
                  <p style={{ margin: 0, fontSize: '0.875rem', lineHeight: '1.5', color: theme.textSecondary }}>{pdfContext.summary}</p>
                </div>
              </div>
            )}

            {/* Transcript Display */}
            <div style={{
              background: theme.cardBg,
              backdropFilter: 'blur(20px)',
              borderRadius: '1rem',
              padding: '2rem',
              border: `1px solid ${theme.border}`,
              minHeight: '400px'
            }}>
              {/* Status Indicators */}
              {isRecording && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  marginBottom: '1.5rem',
                  color: '#ef4444'
                }}>
                  <div style={{
                    width: '12px',
                    height: '12px',
                    background: '#ef4444',
                    borderRadius: '50%',
                    animation: 'pulse 2s infinite'
                  }}></div>
                  <span style={{ fontSize: '1.125rem', fontWeight: '500' }}>🎙️ Live Recording...</span>
                </div>
              )}

              {isTranscribing && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  marginBottom: '1.5rem',
                  color: theme.accent
                }}>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    border: `2px solid ${theme.accent}`,
                    borderTop: '2px solid transparent',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}></div>
                  <span style={{ fontSize: '1.125rem', fontWeight: '500' }}>🧠 AI Processing...</span>
                </div>
              )}

              {/* Transcript Content */}
              {liveTranscript ? (
                <div
                  ref={transcriptRef}
                  style={{
                    fontSize: '1.125rem',
                    lineHeight: '1.7',
                    whiteSpace: 'pre-wrap',
                    maxHeight: '400px',
                    overflowY: 'auto'
                  }}
                >
                  {liveTranscript}
                </div>
              ) : (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '300px',
                  color: theme.textSecondary,
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '4rem', marginBottom: '1rem', opacity: 0.5 }}>🎙️</div>
                  <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem', fontWeight: '300' }}>Ready for Live Transcription</h3>
                  <p style={{ margin: 0, fontSize: '1rem' }}>Click the record button to start listening</p>
                </div>
              )}

              {/* Error Display */}
              {error && (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#ef4444',
                  padding: '1rem',
                  borderRadius: '0.5rem',
                  marginTop: '1rem'
                }}>
                  {error}
                </div>
              )}
            </div>
          </div>
        )}

        {currentView === 'library' && (
          <div style={{ textAlign: 'center', padding: '4rem', color: theme.textSecondary }}>
            <h2>📚 Recording Library</h2>
            <p>Your recorded transcripts will appear here.</p>
          </div>
        )}

        {currentView === 'billing' && (
          <div style={{ textAlign: 'center', padding: '4rem', color: theme.textSecondary }}>
            <h2>💳 Billing Dashboard</h2>
            <p>Usage tracking and payment options.</p>
          </div>
        )}
      </main>

      {/* Floating Record Button */}
      <div style={{
        position: 'fixed',
        bottom: '2rem',
        right: '2rem',
        zIndex: 50
      }}>
        {!isRecording ? (
          <button
            onClick={startRecording}
            disabled={isTranscribing}
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: pdfContext
                ? 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)'
                : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              border: 'none',
              color: 'white',
              fontSize: '1.5rem',
              cursor: 'pointer',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            🎙️
          </button>
        ) : (
          <button
            onClick={stopRecording}
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
              border: 'none',
              color: 'white',
              fontSize: '1.5rem',
              cursor: 'pointer',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            ⏹️
          </button>
        )}
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default ModernIntegratedApp;