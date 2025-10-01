import React, { useState, useRef, useEffect } from 'react';
import { pdfBackendService } from './services/pdfBackendAPI';

type ViewMode = 'recording' | 'library' | 'billing';

function StreamingIntegratedApp() {
  // Theme and UI state
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [currentView, setCurrentView] = useState<ViewMode>('recording');

  // Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [streamingTranscript, setStreamingTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
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
  const streamIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Real-time streaming transcription
  const startStreamingTranscription = async () => {
    const processAudioChunk = async () => {
      if (audioChunksRef.current.length > 0) {
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

          // Append new text to streaming transcript
          setStreamingTranscript(prev => prev + ' ' + result.text);

          // Auto-scroll to bottom
          if (transcriptRef.current) {
            transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
          }
        } catch (err) {
          console.error('Streaming transcription error:', err);
        } finally {
          setIsTranscribing(false);
        }

        // Clear processed chunks
        audioChunksRef.current = [];
      }
    };

    // Process audio chunks every 3 seconds for real-time feedback
    streamIntervalRef.current = setInterval(processAudioChunk, 3000);
  };

  const startRecording = async () => {
    try {
      setError('');
      setStreamingTranscript('');
      setFinalTranscript('');

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
        // Final transcription when recording stops
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
          setFinalTranscript(result.text);
        } catch (err) {
          setError(err instanceof Error ? err.message : '轉錄失敗');
        } finally {
          setIsTranscribing(false);
        }

        stream.getTracks().forEach(track => track.stop());

        // Stop streaming interval
        if (streamIntervalRef.current) {
          clearInterval(streamIntervalRef.current);
          streamIntervalRef.current = null;
        }
      };

      mediaRecorder.start(1000); // Collect data every 1 second
      setIsRecording(true);

      // Start streaming transcription
      startStreamingTranscription();
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

  // Enhanced theme with larger components
  const theme = {
    bg: isDarkMode ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
    cardBg: isDarkMode ? 'rgba(30, 41, 59, 0.9)' : 'rgba(255, 255, 255, 0.95)',
    text: isDarkMode ? '#f8fafc' : '#1e293b',
    textSecondary: isDarkMode ? '#94a3b8' : '#64748b',
    accent: '#6366f1',
    accentHover: '#4f46e5',
    border: isDarkMode ? 'rgba(148, 163, 184, 0.3)' : 'rgba(100, 116, 139, 0.3)',
    success: '#22c55e',
    warning: '#f59e0b',
    danger: '#ef4444',
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: theme.bg,
      color: theme.text,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Enhanced Header */}
      <header style={{
        background: 'rgba(0, 0, 0, 0.15)',
        backdropFilter: 'blur(20px)',
        borderBottom: `2px solid ${theme.border}`,
        padding: '1.5rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{
            width: '48px',
            height: '48px',
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 'bold',
            fontSize: '1.5rem'
          }}>
            L
          </div>
          <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: '600' }}>LectureScript Pro</h1>
          {pdfContext && (
            <span style={{
              background: 'rgba(34, 197, 94, 0.2)',
              color: theme.success,
              padding: '0.5rem 1rem',
              borderRadius: '9999px',
              fontSize: '0.875rem',
              fontWeight: '600'
            }}>
              📄 PDF Enhanced
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          {/* Enhanced Navigation */}
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {(['recording', 'library', 'billing'] as ViewMode[]).map((view) => (
              <button
                key={view}
                onClick={() => setCurrentView(view)}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: currentView === view ? theme.accent : 'transparent',
                  color: currentView === view ? 'white' : theme.textSecondary,
                  border: `2px solid ${currentView === view ? theme.accent : theme.border}`,
                  borderRadius: '0.75rem',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  minWidth: '120px'
                }}
              >
                {view === 'recording' ? '🎙️ 錄製' : view === 'library' ? '📚 資料庫' : '💳 計費'}
              </button>
            ))}
          </div>

          {/* Enhanced PDF Upload */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingPdf}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'rgba(139, 92, 246, 0.2)',
              color: '#8b5cf6',
              border: `2px solid rgba(139, 92, 246, 0.4)`,
              borderRadius: '0.75rem',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              minWidth: '120px'
            }}
          >
            {isUploadingPdf ? '上傳中...' : '📄 + PDF'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />

          {/* Enhanced Theme Toggle */}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            style={{
              padding: '0.75rem',
              background: 'transparent',
              border: `2px solid ${theme.border}`,
              borderRadius: '0.75rem',
              color: theme.text,
              cursor: 'pointer',
              fontSize: '1.5rem'
            }}
          >
            {isDarkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      {/* Enhanced Main Content */}
      <main style={{ padding: '2rem' }}>
        {currentView === 'recording' && (
          <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
            {/* Enhanced PDF Context Panel */}
            {pdfContext && (
              <div style={{
                background: theme.cardBg,
                backdropFilter: 'blur(20px)',
                borderRadius: '1.5rem',
                padding: '2rem',
                marginBottom: '2rem',
                border: `2px solid ${theme.border}`,
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)'
              }}>
                <h3 style={{ margin: '0 0 1.5rem 0', color: theme.accent, fontSize: '1.5rem' }}>📄 PDF Context</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                  <div>
                    <p style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', color: theme.textSecondary, fontWeight: '600' }}>Title:</p>
                    <p style={{ margin: 0, fontWeight: '600', fontSize: '1.125rem' }}>{pdfContext.title}</p>
                  </div>
                  <div>
                    <p style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', color: theme.textSecondary, fontWeight: '600' }}>Pages:</p>
                    <p style={{ margin: 0, fontWeight: '600', fontSize: '1.125rem' }}>{pdfContext.pageCount}</p>
                  </div>
                </div>
                <div style={{ marginTop: '1.5rem' }}>
                  <p style={{ margin: '0 0 0.75rem 0', fontSize: '1rem', color: theme.textSecondary, fontWeight: '600' }}>Summary:</p>
                  <p style={{ margin: 0, fontSize: '1rem', lineHeight: '1.6', color: theme.textSecondary }}>{pdfContext.summary}</p>
                </div>
              </div>
            )}

            {/* Enhanced Transcript Display */}
            <div style={{
              background: theme.cardBg,
              backdropFilter: 'blur(20px)',
              borderRadius: '1.5rem',
              padding: '2.5rem',
              border: `2px solid ${theme.border}`,
              minHeight: '600px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)'
            }}>
              {/* Enhanced Status Indicators */}
              {isRecording && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  marginBottom: '2rem',
                  color: theme.danger,
                  padding: '1rem',
                  background: 'rgba(239, 68, 68, 0.1)',
                  borderRadius: '1rem',
                  border: `2px solid rgba(239, 68, 68, 0.2)`
                }}>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    background: theme.danger,
                    borderRadius: '50%',
                    animation: 'pulse 2s infinite'
                  }}></div>
                  <span style={{ fontSize: '1.5rem', fontWeight: '600' }}>🎙️ Live Recording & Streaming...</span>
                </div>
              )}

              {isTranscribing && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  marginBottom: '2rem',
                  color: theme.accent,
                  padding: '1rem',
                  background: 'rgba(99, 102, 241, 0.1)',
                  borderRadius: '1rem',
                  border: `2px solid rgba(99, 102, 241, 0.2)`
                }}>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    border: `3px solid ${theme.accent}`,
                    borderTop: '3px solid transparent',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}></div>
                  <span style={{ fontSize: '1.5rem', fontWeight: '600' }}>🧠 AI Processing...</span>
                </div>
              )}

              {/* Enhanced Transcript Content */}
              {(streamingTranscript || finalTranscript) ? (
                <div>
                  {/* Live Streaming Text */}
                  {streamingTranscript && isRecording && (
                    <div style={{
                      background: 'rgba(34, 197, 94, 0.1)',
                      border: `2px solid rgba(34, 197, 94, 0.2)`,
                      borderRadius: '1rem',
                      padding: '1.5rem',
                      marginBottom: '1.5rem'
                    }}>
                      <h4 style={{
                        margin: '0 0 1rem 0',
                        color: theme.success,
                        fontSize: '1.25rem',
                        fontWeight: '600'
                      }}>🔄 Live Stream (Real-time)</h4>
                      <div style={{
                        fontSize: '1.25rem',
                        lineHeight: '1.8',
                        whiteSpace: 'pre-wrap'
                      }}>
                        {streamingTranscript}
                      </div>
                    </div>
                  )}

                  {/* Final Transcript */}
                  {finalTranscript && (
                    <div style={{
                      background: 'rgba(99, 102, 241, 0.1)',
                      border: `2px solid rgba(99, 102, 241, 0.2)`,
                      borderRadius: '1rem',
                      padding: '1.5rem'
                    }}>
                      <h4 style={{
                        margin: '0 0 1rem 0',
                        color: theme.accent,
                        fontSize: '1.25rem',
                        fontWeight: '600'
                      }}>✅ Final Transcript</h4>
                      <div
                        ref={transcriptRef}
                        style={{
                          fontSize: '1.25rem',
                          lineHeight: '1.8',
                          whiteSpace: 'pre-wrap',
                          maxHeight: '400px',
                          overflowY: 'auto'
                        }}
                      >
                        {finalTranscript}
                      </div>
                    </div>
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
                  <div style={{ fontSize: '6rem', marginBottom: '2rem', opacity: 0.6 }}>🎙️</div>
                  <h3 style={{ margin: '0 0 1rem 0', fontSize: '2rem', fontWeight: '300' }}>Ready for Live Streaming Transcription</h3>
                  <p style={{ margin: 0, fontSize: '1.25rem' }}>Click the record button to start real-time listening</p>
                </div>
              )}

              {/* Enhanced Error Display */}
              {error && (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: `2px solid rgba(239, 68, 68, 0.3)`,
                  color: theme.danger,
                  padding: '1.5rem',
                  borderRadius: '1rem',
                  marginTop: '1.5rem',
                  fontSize: '1.125rem'
                }}>
                  ❌ {error}
                </div>
              )}
            </div>
          </div>
        )}

        {currentView === 'library' && (
          <div style={{ textAlign: 'center', padding: '6rem', color: theme.textSecondary }}>
            <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📚 Recording Library</h2>
            <p style={{ fontSize: '1.25rem' }}>Your recorded transcripts will appear here.</p>
          </div>
        )}

        {currentView === 'billing' && (
          <div style={{ textAlign: 'center', padding: '6rem', color: theme.textSecondary }}>
            <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>💳 Billing Dashboard</h2>
            <p style={{ fontSize: '1.25rem' }}>Usage tracking and payment options.</p>
          </div>
        )}
      </main>

      {/* Enhanced Floating Record Button */}
      <div style={{
        position: 'fixed',
        bottom: '3rem',
        right: '3rem',
        zIndex: 50
      }}>
        {!isRecording ? (
          <button
            onClick={startRecording}
            disabled={isTranscribing}
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: pdfContext
                ? 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)'
                : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              border: 'none',
              color: 'white',
              fontSize: '2rem',
              cursor: 'pointer',
              boxShadow: '0 15px 35px rgba(0, 0, 0, 0.3)',
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
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
              border: 'none',
              color: 'white',
              fontSize: '2rem',
              cursor: 'pointer',
              boxShadow: '0 15px 35px rgba(0, 0, 0, 0.3)',
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

      {/* Enhanced CSS Animations */}
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

export default StreamingIntegratedApp;