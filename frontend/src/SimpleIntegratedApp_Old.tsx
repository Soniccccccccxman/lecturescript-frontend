import React, { useState, useRef, useEffect } from 'react';
import { pdfBackendService } from './services/pdfBackendAPI';
import LibraryView from './components/library/LibraryView';
import { BillingDashboard } from './components/billing/BillingDashboard';
import { UsageTracker } from './components/billing/UsageTracker';

interface Theme {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  hover: string;
  shadow: string;
}

const lightTheme: Theme = {
  primary: '#37352f',
  secondary: '#787774',
  accent: '#2383e2',
  background: '#ffffff',
  surface: '#f7f6f3',
  text: '#37352f',
  textSecondary: '#787774',
  border: '#e9e9e7',
  hover: '#f1f1ef',
  shadow: 'rgba(15, 15, 15, 0.05)'
};

const darkTheme: Theme = {
  primary: '#ffffff',
  secondary: '#9b9a97',
  accent: '#529cca',
  background: '#191919',
  surface: '#2f3437',
  text: '#ffffff',
  textSecondary: '#9b9a97',
  border: '#373737',
  hover: '#404040',
  shadow: 'rgba(0, 0, 0, 0.3)'
};

type ViewMode = 'recording' | 'library' | 'billing';

function SimpleIntegratedApp() {
  // Theme and UI state
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [currentView, setCurrentView] = useState<ViewMode>('recording');
  const theme = isDarkMode ? darkTheme : lightTheme;

  // Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState('');
  const [intelligentTitle, setIntelligentTitle] = useState('');
  const [keyTopics, setKeyTopics] = useState<string[]>([]);
  const [recordingDuration, setRecordingDuration] = useState(0);

  // PDF states
  const [pdfContext, setPdfContext] = useState<{
    contextId: string;
    title: string;
    summary: string;
    pageCount: number;
  } | null>(null);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const [isPdfPanelOpen, setIsPdfPanelOpen] = useState(false);

  // Usage state (mock data for now)
  const [usage] = useState({
    freeMinutesLimit: 60,
    freeMinutesUsed: 25,
    remainingFreeMinutes: 35,
    totalMinutesUsed: 25,
    subscriptionStatus: 'trial'
  });

  const [user] = useState({
    id: 'user-' + Date.now(),
    email: 'user@example.edu.hk',
    isEduEmail: true
  });

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef<number>(0);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-scroll transcript
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [liveTranscript]);

  // Update recording duration
  useEffect(() => {
    if (isRecording) {
      durationIntervalRef.current = setInterval(() => {
        setRecordingDuration(Date.now() - startTimeRef.current);
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
  }, [isRecording]);

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
      setIsPdfPanelOpen(true);
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

  const startRecording = async () => {
    try {
      if (usage.remainingFreeMinutes <= 0) {
        setError('您已用完免費時間。請購買更多時間以繼續使用。');
        setCurrentView('billing');
        return;
      }

      setError('');
      setLiveTranscript('');
      setIntelligentTitle('');
      setKeyTopics([]);
      startTimeRef.current = Date.now();
      setRecordingDuration(0);

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
            setIntelligentTitle(result.intelligentTitle);
            setKeyTopics(result.keyTopics);
          } else {
            result = await pdfBackendService.transcribeWithPdfContext(audioBlob, '');
          }

          setLiveTranscript(result.text);

          // Here you would save to library and update usage
          // For now, just log the success
          console.log('Recording completed and processed successfully');

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

  const copyTranscript = async () => {
    await navigator.clipboard.writeText(liveTranscript);
  };

  const clearPdfContext = () => {
    setPdfContext(null);
    setIntelligentTitle('');
    setKeyTopics([]);
    setIsPdfPanelOpen(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const navigationItems = [
    { id: 'recording', label: '錄音', icon: '🎤', description: 'Live transcription' },
    { id: 'library', label: '資料庫', icon: '📚', description: 'Recording history' },
    { id: 'billing', label: '帳單', icon: '💳', description: 'Usage & payments' }
  ];

  const renderRecordingView = () => (
    <div className="flex" style={{ height: 'calc(100vh - 73px)' }}>
      {/* Main Transcript Area */}
      <main className="flex-1 p-8">
        <div
          className="h-full rounded-lg border transition-all duration-200"
          style={{
            backgroundColor: theme.surface,
            borderColor: theme.border,
            boxShadow: `0 2px 4px ${theme.shadow}`
          }}
        >
          {/* Transcript Header */}
          <div className="p-6 border-b" style={{ borderColor: theme.border }}>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold" style={{ color: theme.text }}>
                Live Transcript
              </h2>
              <div className="flex items-center gap-3">
                {isRecording && (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium text-red-500">
                      Recording {formatDuration(recordingDuration)}
                    </span>
                  </div>
                )}
                {isTranscribing && (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4">
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" style={{ color: theme.accent }}>
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
                    <span className="text-sm font-medium" style={{ color: theme.accent }}>Processing</span>
                  </div>
                )}
              </div>
            </div>

            {/* Usage Tracker */}
            <div className="mt-4">
              <UsageTracker
                freeMinutesLimit={usage.freeMinutesLimit}
                freeMinutesUsed={usage.freeMinutesUsed}
                remainingFreeMinutes={usage.remainingFreeMinutes}
                subscriptionStatus={usage.subscriptionStatus}
                isEduEmail={user.isEduEmail}
                showDetails={false}
              />
            </div>
          </div>

          {/* Transcript Content */}
          <div
            ref={transcriptRef}
            className="flex-1 p-6 overflow-y-auto"
            style={{ height: 'calc(100% - 140px)' }}
          >
            {liveTranscript ? (
              <div className="space-y-6">
                {/* AI Section Title */}
                {intelligentTitle && (
                  <div
                    className="p-4 rounded-lg border"
                    style={{
                      backgroundColor: theme.accent + '10',
                      borderColor: theme.accent + '30'
                    }}
                  >
                    <h3 className="text-sm font-medium mb-2" style={{ color: theme.accent }}>
                      🎯 Section Title
                    </h3>
                    <p className="text-lg font-semibold" style={{ color: theme.text }}>
                      {intelligentTitle}
                    </p>
                    {keyTopics.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {keyTopics.map((topic, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 rounded text-sm font-medium"
                            style={{
                              backgroundColor: theme.accent + '20',
                              color: theme.accent
                            }}
                          >
                            {topic}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Main Transcript */}
                <div
                  className="text-base leading-relaxed whitespace-pre-wrap"
                  style={{
                    color: theme.text,
                    lineHeight: '1.7'
                  }}
                >
                  {liveTranscript}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div
                    className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: theme.hover }}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: theme.textSecondary }}>
                      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                      <line x1="12" y1="19" x2="12" y2="23"/>
                      <line x1="8" y1="23" x2="16" y2="23"/>
                    </svg>
                  </div>
                  <p className="text-lg font-medium mb-2" style={{ color: theme.text }}>
                    Ready to transcribe
                  </p>
                  <p className="text-sm" style={{ color: theme.textSecondary }}>
                    Click the record button to start listening
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex items-center justify-between mt-4">
          {error && (
            <div
              className="px-4 py-2 rounded-md text-sm"
              style={{
                backgroundColor: '#fee2e2',
                color: '#dc2626'
              }}
            >
              {error}
            </div>
          )}

          {liveTranscript && (
            <button
              onClick={copyTranscript}
              className="ml-auto px-4 py-2 rounded-md text-sm font-medium transition-all duration-200"
              style={{
                backgroundColor: theme.surface,
                color: theme.text,
                border: `1px solid ${theme.border}`
              }}
            >
              Copy Transcript
            </button>
          )}
        </div>
      </main>

      {/* PDF Side Panel */}
      {pdfContext && isPdfPanelOpen && (
        <aside
          className="w-80 border-l p-6 overflow-y-auto"
          style={{
            backgroundColor: theme.surface,
            borderColor: theme.border
          }}
        >
          <div className="flex justify-between items-start mb-6">
            <h3 className="text-lg font-semibold" style={{ color: theme.text }}>
              PDF Context
            </h3>
            <button
              onClick={clearPdfContext}
              className="text-sm text-red-500 hover:text-red-600 transition-colors"
            >
              Remove
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-1" style={{ color: theme.textSecondary }}>
                Title
              </p>
              <p className="font-medium" style={{ color: theme.text }}>
                {pdfContext.title}
              </p>
            </div>

            <div>
              <p className="text-sm font-medium mb-1" style={{ color: theme.textSecondary }}>
                Pages
              </p>
              <p style={{ color: theme.text }}>
                {pdfContext.pageCount}
              </p>
            </div>

            <div>
              <p className="text-sm font-medium mb-1" style={{ color: theme.textSecondary }}>
                Summary
              </p>
              <p className="text-sm leading-relaxed" style={{ color: theme.text }}>
                {pdfContext.summary}
              </p>
            </div>
          </div>
        </aside>
      )}
    </div>
  );

  return (
    <div
      className="min-h-screen transition-colors duration-200"
      style={{
        backgroundColor: theme.background,
        color: theme.text,
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}
    >
      {/* Notion-style Header */}
      <header
        className="border-b px-8 py-4 flex justify-between items-center"
        style={{
          borderColor: theme.border,
          backgroundColor: theme.background
        }}
      >
        <div className="flex items-center gap-4">
          <div
            className="w-8 h-8 rounded-md flex items-center justify-center text-white font-semibold text-sm"
            style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
          >
            L
          </div>
          <h1 className="text-lg font-semibold" style={{ color: theme.text }}>
            LectureScript Pro
          </h1>
          {pdfContext && (
            <span
              className="text-xs px-2 py-1 rounded-full font-medium"
              style={{
                backgroundColor: theme.accent + '15',
                color: theme.accent
              }}
            >
              PDF Enhanced
            </span>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-1">
          {navigationItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id as ViewMode)}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200`}
              style={{
                backgroundColor: currentView === item.id ? theme.accent : 'transparent',
                color: currentView === item.id ? 'white' : theme.textSecondary
              }}
              title={item.description}
            >
              <span className="mr-2">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-md transition-colors duration-200"
            style={{
              backgroundColor: theme.hover,
              color: theme.textSecondary
            }}
            title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDarkMode ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5"/>
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
              </svg>
            )}
          </button>

          {/* PDF Upload (only in recording view) */}
          {currentView === 'recording' && (
            <>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingPdf}
                className="text-sm px-3 py-2 rounded-md transition-all duration-200 font-medium disabled:opacity-50"
                style={{
                  backgroundColor: theme.surface,
                  color: theme.text,
                  border: `1px solid ${theme.border}`
                }}
              >
                {isUploadingPdf ? 'Uploading...' : '+ PDF'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleFileSelect}
                className="hidden"
              />

              {pdfContext && (
                <button
                  onClick={() => setIsPdfPanelOpen(!isPdfPanelOpen)}
                  className="text-sm px-3 py-2 rounded-md transition-all duration-200 font-medium"
                  style={{
                    backgroundColor: theme.surface,
                    color: theme.text,
                    border: `1px solid ${theme.border}`
                  }}
                >
                  {isPdfPanelOpen ? 'Hide' : 'Show'} PDF
                </button>
              )}
            </>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <div style={{ minHeight: 'calc(100vh - 73px)' }}>
        {currentView === 'recording' && renderRecordingView()}

        {currentView === 'library' && (
          <div className="h-full">
            <LibraryView theme={theme} />
          </div>
        )}

        {currentView === 'billing' && (
          <div className="p-8">
            <BillingDashboard
              userId={user.id}
              userEmail={user.email}
            />
          </div>
        )}
      </div>

      {/* Floating Record Button (only in recording view) */}
      {currentView === 'recording' && (
        <button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isTranscribing}
          className="fixed bottom-8 right-8 w-14 h-14 rounded-full shadow-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: isRecording
              ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
              : (pdfContext
                ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)'),
            boxShadow: `0 8px 25px ${theme.shadow}`
          }}
        >
          {isRecording ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white" className="mx-auto">
              <rect x="6" y="6" width="12" height="12" rx="2"/>
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white" className="mx-auto">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              <line x1="12" y1="19" x2="12" y2="23"/>
              <line x1="8" y1="23" x2="16" y2="23"/>
            </svg>
          )}
        </button>
      )}
    </div>
  );
}

export default SimpleIntegratedApp;