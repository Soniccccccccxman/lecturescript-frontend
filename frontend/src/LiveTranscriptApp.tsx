import { useState, useRef, useEffect } from 'react';
import { pdfBackendService } from './services/pdfBackendAPI';

function LiveTranscriptApp() {
  // Core states
  const [isRecording, setIsRecording] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState('');
  const [intelligentTitle, setIntelligentTitle] = useState('');
  const [keyTopics, setKeyTopics] = useState<string[]>([]);

  // PDF states
  const [pdfContext, setPdfContext] = useState<{
    contextId: string;
    title: string;
    summary: string;
    pageCount: number;
  } | null>(null);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const [isPdfPanelOpen, setIsPdfPanelOpen] = useState(false);

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);

  // Auto-scroll transcript
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [liveTranscript]);

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
      setError('');
      setLiveTranscript('');
      setIntelligentTitle('');
      setKeyTopics([]);

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
        } catch (err) {
          setError(err instanceof Error ? err.message : '轉錄失敗');
        } finally {
          setIsTranscribing(false);
        }

        // Stop all audio tracks
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

  return (
    <div className="min-h-screen bg-gray-900 text-white relative overflow-hidden">
      {/* Minimal Header */}
      <header className="bg-black/50 backdrop-blur-sm border-b border-gray-800 px-6 py-3 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-bold">L</span>
          </div>
          <span className="text-lg font-semibold">LectureScript</span>
          {pdfContext && (
            <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">
              PDF Enhanced
            </span>
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* PDF Upload Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingPdf}
            className="text-xs bg-purple-600/20 text-purple-300 hover:bg-purple-600/30 px-3 py-1 rounded transition-colors disabled:opacity-50"
          >
            {isUploadingPdf ? '上傳中...' : '+ PDF'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* PDF Panel Toggle */}
          {pdfContext && (
            <button
              onClick={() => setIsPdfPanelOpen(!isPdfPanelOpen)}
              className="text-xs bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded transition-colors"
            >
              {isPdfPanelOpen ? '隱藏' : '顯示'} PDF
            </button>
          )}
        </div>
      </header>

      <div className="flex h-[calc(100vh-60px)]">
        {/* Main Live Transcript Area - 70% */}
        <main className="flex-1 flex flex-col">
          {/* Live Transcript Display */}
          <div className="flex-1 p-6">
            <div
              ref={transcriptRef}
              className="h-full bg-gray-800/50 rounded-xl p-6 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800"
            >
              {/* Status Indicators */}
              {isRecording && (
                <div className="flex items-center gap-3 text-red-400 mb-6">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-lg font-medium">🎙️ Live Recording...</span>
                </div>
              )}

              {isTranscribing && (
                <div className="flex items-center gap-3 text-blue-400 mb-6">
                  <div className="w-6 h-6">
                    <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                  <span className="text-lg font-medium">🧠 AI Processing...</span>
                </div>
              )}

              {/* Live Transcript Content */}
              {liveTranscript ? (
                <div className="space-y-4">
                  {/* Intelligent Title */}
                  {intelligentTitle && (
                    <div className="bg-purple-500/20 border border-purple-500/30 rounded-lg p-4 mb-6">
                      <h3 className="text-purple-300 text-sm font-medium mb-2">🎯 AI Section Title:</h3>
                      <p className="text-purple-100 text-xl font-semibold">{intelligentTitle}</p>
                      {keyTopics.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {keyTopics.map((topic, index) => (
                            <span
                              key={index}
                              className="bg-purple-500/30 text-purple-200 px-2 py-1 rounded text-sm"
                            >
                              {topic}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Main Transcript */}
                  <div className="prose prose-invert max-w-none">
                    <p className="text-white text-xl leading-relaxed whitespace-pre-wrap font-light">
                      {liveTranscript}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-gray-400">
                    <svg className="w-24 h-24 mx-auto mb-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                    <p className="text-2xl font-light mb-2">Ready for Live Transcription</p>
                    <p className="text-gray-500">Click the record button to start listening</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Action Bar */}
          <div className="p-6 bg-gray-800/30 border-t border-gray-700">
            <div className="flex justify-between items-center">
              {/* Error Display */}
              {error && (
                <div className="bg-red-500/20 text-red-300 px-4 py-2 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {/* Copy Button */}
              {liveTranscript && (
                <button
                  onClick={copyTranscript}
                  className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors text-sm flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy Transcript
                </button>
              )}
            </div>
          </div>
        </main>

        {/* PDF Side Panel - 30% */}
        {pdfContext && isPdfPanelOpen && (
          <aside className="w-96 bg-gray-800/50 border-l border-gray-700 p-6 overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-white">PDF Context</h3>
              <button
                onClick={clearPdfContext}
                className="text-red-400 hover:text-red-300 text-sm"
              >
                Remove
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-gray-300 text-sm">Title:</p>
                <p className="text-white font-medium">{pdfContext.title}</p>
              </div>

              <div>
                <p className="text-gray-300 text-sm">Pages:</p>
                <p className="text-white">{pdfContext.pageCount}</p>
              </div>

              <div>
                <p className="text-gray-300 text-sm">Summary:</p>
                <p className="text-gray-100 text-sm leading-relaxed">{pdfContext.summary}</p>
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* Floating Record Button - Steve Jobs Magic */}
      <div className="fixed bottom-8 right-8 z-50">
        {!isRecording ? (
          <button
            onClick={startRecording}
            disabled={isTranscribing}
            className={`w-16 h-16 rounded-full shadow-2xl transition-all duration-300 transform hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed ${
              pdfContext
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600'
                : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700'
            }`}
          >
            <svg className="w-8 h-8 mx-auto text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
            </svg>
          </button>
        ) : (
          <button
            onClick={stopRecording}
            className="w-16 h-16 rounded-full bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 shadow-2xl transition-all duration-300 transform hover:scale-110"
          >
            <svg className="w-8 h-8 mx-auto text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

export default LiveTranscriptApp;