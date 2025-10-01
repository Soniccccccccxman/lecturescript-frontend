import { useState, useRef } from 'react';
import { backendService } from './services/backendAPI';
import { pdfBackendService } from './services/pdfBackendAPI';

function PdfEnhancedApp() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState('');
  const [intelligentTitle, setIntelligentTitle] = useState('');
  const [keyTopics, setKeyTopics] = useState<string[]>([]);

  // PDF-related state
  const [pdfContext, setPdfContext] = useState<{
    contextId: string;
    title: string;
    summary: string;
    pageCount: number;
  } | null>(null);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePdfUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError('Please select a PDF file');
      return;
    }

    try {
      setIsUploadingPdf(true);
      setError('');
      console.log('📄 Starting PDF upload...');

      const result = await pdfBackendService.uploadPdf(file);

      setPdfContext({
        contextId: result.contextId,
        title: result.title,
        summary: result.summary,
        pageCount: result.pageCount,
      });

      console.log('✅ PDF processed successfully:', result);
    } catch (err) {
      console.error('❌ PDF upload error:', err);
      setError(err instanceof Error ? err.message : 'PDF upload failed');
    } finally {
      setIsUploadingPdf(false);
    }
  };

  const startRecording = async () => {
    try {
      setError('');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        console.log('🎵 Recording stopped, processing audio...');
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

        try {
          setIsTranscribing(true);
          console.log('📤 Sending to backend...');

          let result;
          if (pdfContext) {
            // Use PDF-enhanced transcription
            result = await pdfBackendService.transcribeWithPdfContext(
              audioBlob,
              pdfContext.contextId
            );
            setIntelligentTitle(result.intelligentTitle);
            setKeyTopics(result.keyTopics);
          } else {
            // Use regular transcription
            result = await backendService.transcribeAudio(audioBlob);
          }

          console.log('✅ Transcription result:', result);
          setTranscript(result.text);
        } catch (err) {
          console.error('❌ Transcription error:', err);
          setError(err instanceof Error ? err.message : 'Transcription failed');
        } finally {
          setIsTranscribing(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      console.log('🎙️ Recording started');

    } catch (err) {
      console.error('❌ Recording error:', err);
      setError(err instanceof Error ? err.message : 'Failed to start recording');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      console.log('⏹️ Recording stop requested');
    }
  };

  const testBackend = async () => {
    try {
      const isHealthy = await pdfBackendService.checkHealth();
      console.log('🏥 Backend health:', isHealthy);
      setError(isHealthy ? '✅ PDF-Enhanced Backend is healthy!' : '❌ Backend is not responding');
    } catch (err) {
      console.error('❌ Backend test error:', err);
      setError(err instanceof Error ? err.message : 'Backend test failed');
    }
  };

  const clearPdfContext = () => {
    setPdfContext(null);
    setIntelligentTitle('');
    setKeyTopics([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-center">🎓 LectureScript PDF-Enhanced</h1>

        {/* Backend Test */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Backend Test</h2>
          <button
            onClick={testBackend}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Test PDF-Enhanced Backend
          </button>
        </div>

        {/* PDF Upload Section */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">📄 PDF Context Upload</h2>
          <div className="space-y-4">
            {!pdfContext ? (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handlePdfUpload}
                  disabled={isUploadingPdf}
                  className="mb-2"
                />
                {isUploadingPdf && (
                  <div className="text-blue-600 font-medium">
                    📄 Processing PDF...
                  </div>
                )}
                <p className="text-sm text-gray-600">
                  Upload a PDF (lecture slides, notes, etc.) to enhance transcription accuracy and generate intelligent titles.
                </p>
              </div>
            ) : (
              <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-green-800">✅ PDF Processed</h3>
                    <p className="text-green-700"><strong>Title:</strong> {pdfContext.title}</p>
                    <p className="text-green-700"><strong>Pages:</strong> {pdfContext.pageCount}</p>
                    <p className="text-green-700 mt-2"><strong>Summary:</strong></p>
                    <p className="text-green-600 text-sm">{pdfContext.summary}</p>
                  </div>
                  <button
                    onClick={clearPdfContext}
                    className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
                  >
                    Remove
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Recording Controls */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">
            🎙️ Recording {pdfContext ? '(PDF-Enhanced)' : '(Standard)'}
          </h2>
          <div className="space-y-4">
            {!isRecording ? (
              <button
                onClick={startRecording}
                className={`px-6 py-3 rounded-lg font-semibold text-white ${
                  pdfContext
                    ? 'bg-purple-500 hover:bg-purple-600'
                    : 'bg-red-500 hover:bg-red-600'
                }`}
              >
                🎙️ Start {pdfContext ? 'Enhanced' : 'Regular'} Recording
              </button>
            ) : (
              <button
                onClick={stopRecording}
                className="bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600 font-semibold"
              >
                ⏹️ Stop Recording
              </button>
            )}

            {isTranscribing && (
              <div className="text-blue-600 font-medium">
                📝 {pdfContext ? 'Processing enhanced transcription with PDF context...' : 'Transcribing audio...'}
              </div>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Enhanced Results */}
        {pdfContext && intelligentTitle && (
          <div className="bg-purple-50 border border-purple-200 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-2 text-purple-800">🧠 AI-Generated Section Title:</h3>
            <p className="text-purple-700 font-medium text-lg">{intelligentTitle}</p>

            {keyTopics.length > 0 && (
              <div className="mt-4">
                <h4 className="font-semibold text-purple-800 mb-2">🔑 Key Topics:</h4>
                <div className="flex flex-wrap gap-2">
                  {keyTopics.map((topic, index) => (
                    <span
                      key={index}
                      className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Transcript Display */}
        {transcript && (
          <div className="bg-green-50 border border-green-200 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-2 text-green-800">
              ✅ Transcript {pdfContext ? '(PDF-Enhanced)' : ''}:
            </h3>
            <p className="text-gray-800 leading-relaxed">{transcript}</p>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
          <h3 className="font-semibold text-blue-800 mb-2">📋 使用步驟 (PDF-Enhanced):</h3>
          <ol className="list-decimal list-inside space-y-1 text-blue-700">
            <li>先按 "Test PDF-Enhanced Backend" 確保後端服務正常</li>
            <li>（可選）上傳PDF文件提供上下文（課堂講義、筆記等）</li>
            <li>按 "Start Recording" 開始錄音</li>
            <li>說話 (可以中英混雜)</li>
            <li>按 "Stop Recording" 停止錄音</li>
            <li>等待轉錄結果，如有PDF將獲得智能標題和關鍵主題</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

export default PdfEnhancedApp;