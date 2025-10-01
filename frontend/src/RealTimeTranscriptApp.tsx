import React, { useState, useRef, useEffect } from 'react';
import { pdfBackendService } from './services/pdfBackendAPI';

type RecordingState = 'idle' | 'recording' | 'paused';

function RealTimeTranscriptApp() {
  // Theme and UI state - Light mode default
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Real-time streaming states
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [transcript, setTranscript] = useState('');
  const [streamingText, setStreamingText] = useState(''); // 🔥 Live streaming text
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [currentTitle, setCurrentTitle] = useState('');

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

  // Real-time refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const streamIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Duration counter
  useEffect(() => {
    if (recordingState === 'recording') {
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

  // 🔥 REAL-TIME STREAMING AUDIO PROCESSING
  const processAudioChunk = async () => {
    if (isProcessing || audioChunksRef.current.length === 0) {
      return;
    }

    console.log(`🎵 Processing ${audioChunksRef.current.length} audio chunks in real-time`);

    setIsProcessing(true);
    setStreamingText('⏳'); // Show immediate feedback

    try {
      // 🔥 Process smaller chunks for real-time results - Use actual MediaRecorder format
      const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
      const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });

      console.log(`🔍 DETAILED AUDIO DEBUG:`);
      console.log(`   - Chunks: ${audioChunksRef.current.length}`);
      console.log(`   - Blob size: ${audioBlob.size} bytes`);
      console.log(`   - Blob type: ${audioBlob.type}`);
      console.log(`   - MediaRecorder MIME: ${mimeType}`);
      console.log(`   - First chunk size: ${audioChunksRef.current[0]?.size || 'none'} bytes`);

      // Clear chunks immediately for next batch
      audioChunksRef.current = [];

      // Skip tiny chunks but be more permissive for real-time
      if (audioBlob.size < 2000) {
        console.log('🚫 Audio chunk too small, skipping...');
        setIsProcessing(false);
        setStreamingText('');
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

      console.log(`✅ Real-time result: "${result.text}"`);

      // 🔥 Stream the text with typing effect
      if (result.text && result.text.trim()) {
        const newText = result.text.trim();

        // Show typing animation
        setStreamingText(newText);

        // After a brief moment, append to main transcript
        setTimeout(() => {
          setTranscript(prev => {
            const combinedText = prev ? `${prev} ${newText}` : newText;
            return combinedText;
          });
          setStreamingText(''); // Clear streaming text

          // Auto-generate title from first meaningful content
          if (!currentTitle && newText.length > 15) {
            setCurrentTitle(generateTitleFromContent(newText));
          }

          // Auto-scroll to bottom
          if (transcriptRef.current) {
            transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
          }
        }, 300); // Brief delay to show streaming effect
      } else {
        setStreamingText(''); // Clear if no text
      }

    } catch (err) {
      console.error('❌ Real-time processing error:', err);
      setError(err instanceof Error ? err.message : 'Real-time processing failed');
      setStreamingText('');
    }

    setIsProcessing(false);
  };

  // Clean stop
  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (streamIntervalRef.current) {
      clearInterval(streamIntervalRef.current);
      streamIntervalRef.current = null;
    }

    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    setRecordingState('idle');
    setIsProcessing(false);
  };

  // Start real-time recording
  const startRecording = async () => {
    try {
      setError('');

      // Reset everything
      setTranscript('');
      setCurrentTitle('');
      setStreamingText('');
      audioChunksRef.current = [];

      // 🔥 Better audio constraints for real-time
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000, // Lower sample rate for better compatibility
          channelCount: 1
        }
      });

      streamRef.current = stream;

      // 🔥 Use more compatible MediaRecorder settings
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm';
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/wav';
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType
      });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          console.log(`🎤 New audio chunk: ${event.data.size} bytes`);
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        console.log('🛑 MediaRecorder stopped');
        // Process any remaining chunks
        if (audioChunksRef.current.length > 0) {
          await processAudioChunk();
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error('❌ MediaRecorder error:', event);
        setError('錄音設備錯誤，請重試');
        stopRecording();
      };

      // 🔥 Real-time chunks - 2 seconds for immediate processing
      mediaRecorder.start(2000);
      setRecordingState('recording');
      setSessionStartTime(new Date());

      // 🔥 Process audio every 3 seconds for real-time experience
      streamIntervalRef.current = setInterval(processAudioChunk, 3000);

      console.log('🎬 Real-time recording started');

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '無法開始錄音';
      setError(errorMessage);
      console.error('❌ Start recording error:', err);
    }
  };

  // Pause recording
  const pauseRecording = () => {
    if (mediaRecorderRef.current && recordingState === 'recording') {
      console.log('⏸️ Pausing recording...');
      mediaRecorderRef.current.pause();
      setRecordingState('paused');

      if (streamIntervalRef.current) {
        clearInterval(streamIntervalRef.current);
        streamIntervalRef.current = null;
      }
    }
  };

  // Resume recording
  const resumeRecording = () => {
    if (mediaRecorderRef.current && recordingState === 'paused') {
      console.log('▶️ Resuming recording...');
      mediaRecorderRef.current.resume();
      setRecordingState('recording');

      streamIntervalRef.current = setInterval(processAudioChunk, 3000);
    }
  };

  // Finish recording
  const finishRecording = () => {
    console.log('🏁 Finishing recording...');
    stopRecording();
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

  // Clean theme - Light mode default
  const theme = {
    bg: isDarkMode ? '#000000' : '#ffffff',
    cardBg: isDarkMode ? '#1a1a1a' : '#f8f9fa',
    text: isDarkMode ? '#ffffff' : '#000000',
    textSecondary: isDarkMode ? '#888888' : '#666666',
    accent: '#007AFF',
    border: isDarkMode ? '#333333' : '#e1e5e9',
    success: '#34C759',
    danger: '#FF3B30',
    processing: '#FF9500',
  };

  // 🔥 REAL-TIME STREAMING TEXT COMPONENT
  const StreamingText = ({ text }: { text: string }) => {
    const [displayText, setDisplayText] = useState('');
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
      if (text && currentIndex < text.length) {
        const timer = setTimeout(() => {
          setDisplayText(prev => prev + text[currentIndex]);
          setCurrentIndex(currentIndex + 1);
        }, 50); // Typing speed
        return () => clearTimeout(timer);
      } else if (!text) {
        setDisplayText('');
        setCurrentIndex(0);
      }
    }, [text, currentIndex]);

    if (!text) return null;

    return (
      <span style={{
        color: theme.accent,
        fontWeight: '500',
        opacity: 0.8
      }}>
        {displayText}
        <span style={{
          animation: 'pulse 1s infinite',
          color: theme.accent
        }}>|</span>
      </span>
    );
  };

  // 🔥 SKELETON LOADING UI - Like your image
  const SkeletonLoading = () => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      padding: '16px 0'
    }}>
      {/* First line - 80% width */}
      <div style={{
        height: '20px',
        width: '80%',
        background: '#e1e5e9',
        borderRadius: '12px',
        animation: 'shimmer 1.5s infinite ease-in-out'
      }} />

      {/* Second line - full width */}
      <div style={{
        height: '20px',
        width: '100%',
        background: '#e1e5e9',
        borderRadius: '12px',
        animation: 'shimmer 1.5s infinite ease-in-out',
        animationDelay: '0.1s'
      }} />

      {/* Third line - 60% width */}
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

  return (
    <div style={{
      minHeight: '100vh',
      background: theme.bg,
      color: theme.text,
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
      transition: 'all 0.2s ease'
    }}>
      {/* Simple Header */}
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
            LectureScript - 即時轉錄
          </h1>

          {/* Simple Status Display */}
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
                LIVE 即時
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
                PAUSED 暫停
              </div>
            )}

            {/* Duration Counter */}
            {(recordingState === 'recording' || recordingState === 'paused') && (
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

      {/* Main Content - Single Screen */}
      <main style={{
        maxWidth: '900px',
        margin: '0 auto',
        padding: '40px 24px'
      }}>
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
              {transcript || streamingText ? (
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
                  {/* 🔥 Real-time streaming text with typing effect */}
                  {streamingText && (
                    <>
                      {transcript && ' '}
                      <StreamingText text={streamingText} />
                    </>
                  )}
                  {/* 🔥 Live recording cursor */}
                  {recordingState === 'recording' && !streamingText && (
                    <span style={{
                      color: theme.danger,
                      animation: 'pulse 1.5s infinite',
                      marginLeft: transcript ? '4px' : '0'
                    }}>|</span>
                  )}
                  {/* 🔥 Skeleton loading indicator */}
                  {isProcessing && !streamingText && <SkeletonLoading />}
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
                    即時轉錄
                  </h3>
                  <p style={{
                    margin: 0,
                    fontSize: '16px',
                    color: theme.textSecondary
                  }}>
                    點擊麥克風開始實時語音轉文字
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
                zIndex: 10,
                cursor: 'pointer'
              }}
              onClick={() => setError('')}
              >
                {error}
                <div style={{ fontSize: '12px', marginTop: '4px', opacity: 0.8 }}>
                  點擊關閉
                </div>
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
                disabled={isProcessing}
                style={{
                  padding: '12px 24px',
                  background: theme.processing,
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '500',
                  cursor: isProcessing ? 'not-allowed' : 'pointer',
                  opacity: isProcessing ? 0.5 : 1
                }}
              >
                {recordingState === 'recording' ? '⏸️ 暫停' : '▶️ 繼續'}
              </button>

              <button
                onClick={finishRecording}
                style={{
                  padding: '12px 24px',
                  background: theme.danger,
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                🏁 完成錄音
              </button>
            </div>
          )}
        </div>
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
            onClick={startRecording}
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

      {/* Enhanced CSS with streaming animations */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }

        @keyframes shimmer {
          0% {
            background-position: -200px 0;
          }
          100% {
            background-position: calc(200px + 100%) 0;
          }
        }
      `}</style>
    </div>
  );
}

export default RealTimeTranscriptApp;