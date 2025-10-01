import { useState, useEffect, useCallback } from 'react';
import { Mic, Settings, History, BarChart3, Download } from 'lucide-react';
import { useAudioRecording } from './hooks/useAudioRecording';
import { useSessionManager } from './hooks/useSessionManager';
import { WhisperService } from './services/whisperAPI';
import { SummaryService } from './services/summaryService';
import { ExportService } from './services/exportService';
import { RecordingControls } from './components/recording/RecordingControls';
import { AudioVisualizer } from './components/recording/AudioVisualizer';
import { TranscriptDisplay } from './components/transcript/TranscriptDisplay';
import { Button } from './components/ui/Button';
import { Input } from './components/ui/Input';
import { cn } from './utils/cn';
import { formatCurrency, calculateTranscriptionCost } from './utils/billing';
import { storage } from './utils/storage';
import type { AppSettings } from './types';

function App() {
  const [apiKey, setApiKey] = useState('');
  const [sessionName, setSessionName] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionError, setTranscriptionError] = useState('');
  const [settings, setSettings] = useState<AppSettings | null>(null);
  // Removed unused showSettings state
  const [currentTab, setCurrentTab] = useState<'record' | 'history' | 'settings'>('record');

  // Services
  const [whisperService] = useState(() => new WhisperService());
  const [summaryService] = useState(() => new SummaryService());
  const [exportService] = useState(() => new ExportService());

  // Hooks
  const recording = useAudioRecording();
  const sessionManager = useSessionManager();

  // Initialize settings
  useEffect(() => {
    const initializeSettings = async () => {
      await storage.initialize();
      const savedSettings = await storage.getSettings();
      const defaultSettings = storage.getDefaultSettings();

      const finalSettings = savedSettings || defaultSettings;
      setSettings(finalSettings);
      setApiKey(finalSettings.apiSettings.openaiApiKey);

      if (finalSettings.apiSettings.openaiApiKey) {
        whisperService.setApiKey(finalSettings.apiSettings.openaiApiKey);
        summaryService.setApiKey(finalSettings.apiSettings.openaiApiKey);
      }
    };

    initializeSettings();
  }, [whisperService, summaryService]);

  // Auto-generate session name
  useEffect(() => {
    if (!sessionName) {
      const now = new Date();
      const defaultName = `Lecture ${now.toLocaleDateString()} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      setSessionName(defaultName);
    }
  }, [sessionName]);

  // Handle recording start
  const handleStartRecording = useCallback(async () => {
    if (!apiKey.trim()) {
      setTranscriptionError('Please enter your OpenAI API key in settings first.');
      setCurrentTab('settings');
      return;
    }

    try {
      setTranscriptionError('');
      sessionManager.createSession(sessionName);
      await recording.startRecording();
    } catch (error) {
      setTranscriptionError(error instanceof Error ? error.message : 'Failed to start recording');
    }
  }, [apiKey, sessionName, sessionManager, recording]);

  // Handle transcription of audio chunks
  const handleTranscription = useCallback(async (audioBlob: Blob) => {
    if (!sessionManager.currentSession) return;

    try {
      setIsTranscribing(true);
      setTranscriptionError('');

      const result = await whisperService.transcribeAudio(audioBlob, {
        language: sessionManager.currentSession.language === 'mixed' ? undefined : sessionManager.currentSession.language,
        prompt: 'University lecture in Hong Kong. May contain Cantonese and English.',
      });

      // Add segments to current session
      for (const segment of result.segments) {
        await sessionManager.addSegment(segment);
      }

      // Update session cost
      await sessionManager.updateSession({
        cost: sessionManager.currentSession.cost + result.cost,
      });

    } catch (error) {
      console.error('Transcription failed:', error);
      setTranscriptionError(error instanceof Error ? error.message : 'Transcription failed');
    } finally {
      setIsTranscribing(false);
    }
  }, [sessionManager, whisperService]);

  // Handle recording stop
  const handleStopRecording = useCallback(async () => {
    if (!sessionManager.currentSession) return;

    try {
      recording.stopRecording();

      // Process final audio if available
      if (recording.audioBlob) {
        await handleTranscription(recording.audioBlob);
      }

      // Generate summary if session has content
      if (sessionManager.currentSession.segments.length > 0) {
        try {
          const summaryResult = await summaryService.generateSummary(sessionManager.currentSession, {
            language: 'auto',
            style: 'bullet',
            length: 'medium',
          });

          await sessionManager.completeSession(Date.now(), summaryResult.summary);
        } catch (summaryError) {
          console.warn('Summary generation failed:', summaryError);
          await sessionManager.completeSession();
        }
      } else {
        await sessionManager.completeSession();
      }

      // Generate new session name for next recording
      const now = new Date();
      setSessionName(`Lecture ${now.toLocaleDateString()} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);

    } catch (error) {
      console.error('Failed to stop recording:', error);
      setTranscriptionError('Failed to complete session');
    }
  }, [sessionManager, recording, summaryService, handleTranscription]);

  // Save API key
  const handleSaveApiKey = useCallback(async (newApiKey: string) => {
    setApiKey(newApiKey);
    whisperService.setApiKey(newApiKey);
    summaryService.setApiKey(newApiKey);

    if (settings) {
      const updatedSettings = {
        ...settings,
        apiSettings: { ...settings.apiSettings, openaiApiKey: newApiKey }
      };
      setSettings(updatedSettings);
      await storage.saveSettings(updatedSettings);
    }
  }, [settings, whisperService, summaryService]);

  // Export current session
  const handleExport = useCallback(async () => {
    if (!sessionManager.currentSession) return;

    try {
      const result = await exportService.exportSession(sessionManager.currentSession, {
        format: 'md',
        includeTimestamps: true,
        includeSummary: true,
        includeMetadata: true,
        language: 'both',
      });

      exportService.downloadFile(result.data, result.filename, result.mimeType);
    } catch (error) {
      console.error('Export failed:', error);
    }
  }, [sessionManager, exportService]);

  const estimatedCost = sessionManager.currentSession
    ? calculateTranscriptionCost(recording.duration / 60)
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            LectureScript
          </h1>
          <p className="text-lg text-gray-600">
            Real-time transcription for Hong Kong university students
          </p>
        </div>

        {/* Navigation */}
        <div className="flex justify-center mb-8">
          <div className="bg-white rounded-xl p-1 shadow-lg">
            <div className="flex space-x-1">
              {[
                { id: 'record', label: 'Record', icon: Mic },
                { id: 'history', label: 'History', icon: History },
                { id: 'settings', label: 'Settings', icon: Settings },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setCurrentTab(id as any)}
                  className={cn(
                    'flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all',
                    currentTab === id
                      ? 'bg-primary-600 text-white shadow-md'
                      : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        {currentTab === 'record' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Recording Controls */}
            <div className="space-y-6">
              {/* Session Setup */}
              <div className="bg-white rounded-xl p-6 shadow-lg">
                <h2 className="text-xl font-semibold mb-4">New Lecture Session</h2>
                <Input
                  label="Session Name"
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  placeholder="Enter lecture name..."
                  className="mb-4"
                />

                {/* API Key Status */}
                {!apiKey && (
                  <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-yellow-800 text-sm">
                      ⚠️ OpenAI API key required. Configure in Settings tab.
                    </p>
                  </div>
                )}

                {/* Error Display */}
                {transcriptionError && (
                  <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-800 text-sm">{transcriptionError}</p>
                  </div>
                )}
              </div>

              {/* Recording Controls */}
              <div className="bg-white rounded-xl p-6 shadow-lg">
                <RecordingControls
                  isRecording={recording.isRecording}
                  isPaused={recording.isPaused}
                  duration={recording.duration}
                  onStart={handleStartRecording}
                  onPause={recording.pauseRecording}
                  onResume={recording.resumeRecording}
                  onStop={handleStopRecording}
                  disabled={!apiKey || isTranscribing}
                />
              </div>

              {/* Audio Visualizer */}
              <div className="bg-white rounded-xl p-6 shadow-lg">
                <h3 className="text-lg font-semibold mb-4">Audio Level</h3>
                <AudioVisualizer
                  audioLevel={recording.getAudioLevel()}
                  waveformData={recording.getWaveformData()}
                  isActive={recording.isRecording && !recording.isPaused}
                  className="h-24"
                />
              </div>

              {/* Session Stats */}
              {sessionManager.currentSession && (
                <div className="bg-white rounded-xl p-6 shadow-lg">
                  <h3 className="text-lg font-semibold mb-4">Session Stats</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-gray-500">Words</div>
                      <div className="text-xl font-bold">
                        {sessionManager.currentSession.wordCount}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Estimated Cost</div>
                      <div className="text-xl font-bold text-green-600">
                        {formatCurrency(estimatedCost)}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Transcript */}
            <div className="space-y-6">
              <TranscriptDisplay
                segments={sessionManager.currentSession?.segments || []}
                isTranscribing={isTranscribing}
                onDownload={handleExport}
                className="h-[600px]"
              />

              {/* Usage Stats */}
              <div className="bg-white rounded-xl p-6 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Usage This Month</h3>
                  <BarChart3 className="w-5 h-5 text-gray-400" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-500">Minutes</div>
                    <div className="text-xl font-bold">
                      {Math.round(sessionManager.usageStats.currentMonthUsage)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Cost</div>
                    <div className="text-xl font-bold">
                      {formatCurrency(sessionManager.usageStats.currentMonthCost)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* History Tab */}
        {currentTab === 'history' && (
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <h2 className="text-xl font-semibold mb-4">Session History</h2>
            {sessionManager.sessions.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No sessions yet. Start your first recording!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {sessionManager.sessions.slice(0, 10).map((session) => (
                  <div
                    key={session.id}
                    className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium">{session.name}</h3>
                        <p className="text-sm text-gray-500">
                          {new Date(session.startTime).toLocaleString()}
                        </p>
                        <p className="text-sm text-gray-500">
                          {Math.round(session.duration / 60)}min • {session.wordCount} words • {formatCurrency(session.cost)}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        leftIcon={<Download className="w-4 h-4" />}
                        onClick={() => {
                          exportService.exportSession(session, {
                            format: 'md',
                            includeTimestamps: true,
                            includeSummary: true,
                            includeMetadata: true,
                            language: 'both',
                          }).then(result => {
                            exportService.downloadFile(result.data, result.filename, result.mimeType);
                          });
                        }}
                      >
                        Export
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Settings Tab */}
        {currentTab === 'settings' && (
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <h2 className="text-xl font-semibold mb-6">Settings</h2>
            <div className="space-y-6">
              <div>
                <Input
                  label="OpenAI API Key"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  onBlur={(e) => handleSaveApiKey(e.target.value)}
                  placeholder="sk-..."
                  helper="Your API key is stored locally and never sent to our servers"
                />
              </div>

              <div className="pt-4 border-t">
                <h3 className="font-medium mb-4">Usage Statistics</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-primary-600">
                      {sessionManager.usageStats.sessionsCount}
                    </div>
                    <div className="text-sm text-gray-500">Total Sessions</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-primary-600">
                      {Math.round(sessionManager.usageStats.totalMinutes)}
                    </div>
                    <div className="text-sm text-gray-500">Total Minutes</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(sessionManager.usageStats.totalCost)}
                    </div>
                    <div className="text-sm text-gray-500">Total Cost</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(sessionManager.usageStats.currentMonthCost)}
                    </div>
                    <div className="text-sm text-gray-500">This Month</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App