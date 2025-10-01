import React, { useState, useRef, useEffect } from 'react';
import { pdfBackendService } from './services/pdfBackendAPI';
import LibraryView from './components/library/LibraryView';
import { BillingDashboard } from './components/billing/BillingDashboard';
import { UsageTracker } from './components/billing/UsageTracker';
import {
  AppleTheme,
  appleLight,
  appleDark,
  PremiumButton,
  GlassCard,
  HeroSection,
  FloatingActionButton,
  PremiumNavigation,
  globalStyles,
} from './components/ui/DesignSystem';

type ViewMode = 'recording' | 'library' | 'billing';

function SimpleIntegratedApp() {
  // Theme and UI state
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [currentView, setCurrentView] = useState<ViewMode>('recording');
  const [hasStarted, setHasStarted] = useState(false);
  const theme: AppleTheme = isDarkMode ? appleDark : appleLight;

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

  // Add global styles
  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.textContent = globalStyles;
    document.head.appendChild(styleElement);
    return () => document.head.removeChild(styleElement);
  }, []);

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
      setError(err instanceof Error ? err.message : 'PDF upload failed');
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
        setError('You have used all your free minutes. Please upgrade to continue.');
        setCurrentView('billing');
        return;
      }

      setError('');
      setLiveTranscript('');
      setIntelligentTitle('');
      setKeyTopics([]);
      startTimeRef.current = Date.now();
      setRecordingDuration(0);
      setHasStarted(true);

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
          console.log('Recording completed and processed successfully');

        } catch (err) {
          setError(err instanceof Error ? err.message : 'Transcription failed');
        } finally {
          setIsTranscribing(false);
        }

        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to start recording');
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

  const handleGetStarted = () => {
    setHasStarted(true);
  };

  const navigationItems = [
    {
      id: 'recording',
      label: 'Record',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
          <line x1="12" y1="19" x2="12" y2="23"/>
          <line x1="8" y1="23" x2="16" y2="23"/>
        </svg>
      ),
      description: 'Live transcription'
    },
    {
      id: 'library',
      label: 'Library',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
        </svg>
      ),
      description: 'Recording history'
    },
    {
      id: 'billing',
      label: 'Billing',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
          <line x1="1" y1="10" x2="23" y2="10"/>
        </svg>
      ),
      description: 'Usage & payments'
    }
  ];

  const renderRecordingView = () => {
    // Show hero section if user hasn't started yet and no transcript
    if (!hasStarted && !liveTranscript) {
      return <HeroSection theme={theme} onGetStarted={handleGetStarted} />;
    }

    return (
      <div className="flex" style={{ height: 'calc(100vh - 80px)' }}>
        {/* Main Transcript Area */}
        <main className="flex-1 p-8">
          <GlassCard theme={theme} className="h-full p-0 overflow-hidden">
            {/* Header */}
            <div className="p-8 border-b" style={{ borderColor: theme.colors.borderSubtle }}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1
                    className="text-3xl font-bold mb-2"
                    style={{
                      color: theme.colors.text,
                      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                      letterSpacing: '-0.02em',
                    }}
                  >
                    Live Transcript
                  </h1>
                  <p style={{ color: theme.colors.textSecondary, fontSize: '16px' }}>
                    Real-time AI-powered transcription
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  {isRecording && (
                    <div className="flex items-center gap-3 px-4 py-2 rounded-full" style={{
                      background: theme.colors.glassBg,
                      border: `1px solid ${theme.colors.borderSubtle}`,
                      backdropFilter: theme.blur.subtle,
                    }}>
                      <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                      <span className="text-sm font-semibold text-red-500">
                        {formatDuration(recordingDuration)}
                      </span>
                    </div>
                  )}
                  {isTranscribing && (
                    <div className="flex items-center gap-3 px-4 py-2 rounded-full" style={{
                      background: theme.colors.glassBg,
                      border: `1px solid ${theme.colors.borderSubtle}`,
                      backdropFilter: theme.blur.subtle,
                    }}>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"
                           style={{ color: theme.colors.accent }} />
                      <span className="text-sm font-semibold" style={{ color: theme.colors.accent }}>
                        Processing
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Usage Tracker */}
              <UsageTracker
                freeMinutesLimit={usage.freeMinutesLimit}
                freeMinutesUsed={usage.freeMinutesUsed}
                remainingFreeMinutes={usage.remainingFreeMinutes}
                subscriptionStatus={usage.subscriptionStatus}
                isEduEmail={user.isEduEmail}
                showDetails={false}
              />
            </div>

            {/* Content */}
            <div
              ref={transcriptRef}
              className="flex-1 p-8 overflow-y-auto"
              style={{ height: 'calc(100% - 200px)' }}
            >
              {liveTranscript ? (
                <div className="space-y-8">
                  {/* AI Insights */}
                  {intelligentTitle && (
                    <GlassCard theme={theme} className="p-6" elevated>
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                             style={{ background: theme.gradients.accent }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                            <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold mb-2" style={{ color: theme.colors.text }}>
                            {intelligentTitle}
                          </h3>
                          {keyTopics.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {keyTopics.map((topic, index) => (
                                <span
                                  key={index}
                                  className="px-3 py-1 rounded-full text-sm font-medium"
                                  style={{
                                    background: theme.colors.glassBg,
                                    border: `1px solid ${theme.colors.borderSubtle}`,
                                    color: theme.colors.text,
                                    backdropFilter: theme.blur.subtle,
                                  }}
                                >
                                  {topic}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </GlassCard>
                  )}

                  {/* Transcript */}
                  <div
                    className="text-lg leading-relaxed whitespace-pre-wrap"
                    style={{
                      color: theme.colors.text,
                      lineHeight: '1.8',
                      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                    }}
                  >
                    {liveTranscript}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center max-w-md">
                    <div className="w-24 h-24 mx-auto mb-6 rounded-3xl flex items-center justify-center animate-float"
                         style={{ background: theme.gradients.primary }}>
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
                        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                        <line x1="12" y1="19" x2="12" y2="23"/>
                        <line x1="8" y1="23" x2="16" y2="23"/>
                      </svg>
                    </div>
                    <h3 className="text-2xl font-bold mb-3" style={{ color: theme.colors.text }}>
                      Ready to Record
                    </h3>
                    <p className="text-lg mb-6" style={{ color: theme.colors.textSecondary }}>
                      Click the record button to start your AI-powered transcription
                    </p>
                    <div className="flex flex-wrap justify-center gap-3 text-sm">
                      {['Real-time processing', 'AI insights', 'PDF enhanced'].map((feature, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 rounded-full font-medium"
                          style={{
                            background: theme.colors.glassBg,
                            border: `1px solid ${theme.colors.borderSubtle}`,
                            color: theme.colors.textSecondary,
                            backdropFilter: theme.blur.subtle,
                          }}
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </GlassCard>

          {/* Actions */}
          <div className="flex items-center justify-between mt-6">
            {error && (
              <GlassCard theme={theme} className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ff453a" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="15" y1="9" x2="9" y2="15"/>
                    <line x1="9" y1="9" x2="15" y2="15"/>
                  </svg>
                  <span className="text-sm font-medium" style={{ color: '#ff453a' }}>
                    {error}
                  </span>
                </div>
              </GlassCard>
            )}

            {liveTranscript && (
              <div className="ml-auto">
                <PremiumButton
                  theme={theme}
                  variant="secondary"
                  onClick={copyTranscript}
                  icon={
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                    </svg>
                  }
                >
                  Copy Transcript
                </PremiumButton>
              </div>
            )}
          </div>
        </main>

        {/* PDF Panel */}
        {pdfContext && isPdfPanelOpen && (
          <aside className="w-96 border-l overflow-y-auto" style={{ borderColor: theme.colors.borderSubtle }}>
            <GlassCard theme={theme} className="h-full rounded-none border-0 p-8">
              <div className="flex justify-between items-start mb-6">
                <h3 className="text-xl font-bold" style={{ color: theme.colors.text }}>
                  PDF Context
                </h3>
                <PremiumButton
                  theme={theme}
                  variant="ghost"
                  onClick={clearPdfContext}
                  icon={
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  }
                >
                  Remove
                </PremiumButton>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-sm font-semibold mb-2 block" style={{ color: theme.colors.textSecondary }}>
                    Document Title
                  </label>
                  <p className="text-lg font-medium" style={{ color: theme.colors.text }}>
                    {pdfContext.title}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-semibold mb-2 block" style={{ color: theme.colors.textSecondary }}>
                    Pages
                  </label>
                  <p style={{ color: theme.colors.text }}>
                    {pdfContext.pageCount} pages
                  </p>
                </div>

                <div>
                  <label className="text-sm font-semibold mb-2 block" style={{ color: theme.colors.textSecondary }}>
                    Summary
                  </label>
                  <p className="leading-relaxed" style={{ color: theme.colors.text }}>
                    {pdfContext.summary}
                  </p>
                </div>
              </div>
            </GlassCard>
          </aside>
        )}
      </div>
    );
  };

  return (
    <div
      className="min-h-screen transition-all duration-500"
      style={{
        background: theme.colors.background,
        color: theme.colors.text,
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      {/* Premium Header */}
      <header className="sticky top-0 z-50 border-b backdrop-blur-xl"
              style={{
                borderColor: theme.colors.borderSubtle,
                background: theme.colors.glassBg,
                backdropFilter: theme.colors.glassBlur,
              }}>
        <div className="px-8 py-4 flex justify-between items-center">
          {/* Brand */}
          <div className="flex items-center gap-4">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg"
              style={{ background: theme.gradients.primary }}
            >
              L
            </div>
            <div>
              <h1 className="text-xl font-bold" style={{ color: theme.colors.text }}>
                LectureScript Pro
              </h1>
              {pdfContext && (
                <span
                  className="text-xs px-2 py-1 rounded-full font-semibold"
                  style={{
                    background: theme.colors.glassBg,
                    border: `1px solid ${theme.colors.borderSubtle}`,
                    color: theme.colors.accent,
                  }}
                >
                  PDF Enhanced
                </span>
              )}
            </div>
          </div>

          {/* Navigation */}
          <PremiumNavigation
            items={navigationItems}
            currentView={currentView}
            onViewChange={(viewId) => setCurrentView(viewId as ViewMode)}
            theme={theme}
          />

          {/* Actions */}
          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <PremiumButton
              theme={theme}
              variant="ghost"
              onClick={toggleTheme}
              icon={
                isDarkMode ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="5"/>
                    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
                  </svg>
                )
              }
            />

            {/* PDF Upload */}
            {currentView === 'recording' && (
              <>
                <PremiumButton
                  theme={theme}
                  variant="secondary"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingPdf}
                  loading={isUploadingPdf}
                  icon={
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14,2 14,8 20,8"/>
                      <line x1="16" y1="13" x2="8" y2="13"/>
                      <line x1="16" y1="17" x2="8" y2="17"/>
                      <polyline points="10,9 9,9 8,9"/>
                    </svg>
                  }
                >
                  {isUploadingPdf ? 'Uploading' : 'Add PDF'}
                </PremiumButton>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {pdfContext && (
                  <PremiumButton
                    theme={theme}
                    variant="ghost"
                    onClick={() => setIsPdfPanelOpen(!isPdfPanelOpen)}
                  >
                    {isPdfPanelOpen ? 'Hide' : 'Show'} PDF
                  </PremiumButton>
                )}
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div style={{ minHeight: 'calc(100vh - 80px)' }}>
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

      {/* Floating Action Button */}
      {currentView === 'recording' && hasStarted && (
        <FloatingActionButton
          isRecording={isRecording}
          isTranscribing={isTranscribing}
          onClick={isRecording ? stopRecording : startRecording}
          theme={theme}
        />
      )}
    </div>
  );
}

export default SimpleIntegratedApp;