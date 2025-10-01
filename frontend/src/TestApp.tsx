import { useState, useRef } from 'react';
import { backendService } from './services/backendAPI';

function TestApp() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

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

          const result = await backendService.transcribeAudio(audioBlob);
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
      const isHealthy = await backendService.checkHealth();
      console.log('🏥 Backend health:', isHealthy);
      setError(isHealthy ? '✅ Backend is healthy!' : '❌ Backend is not responding');
    } catch (err) {
      console.error('❌ Backend test error:', err);
      setError(err instanceof Error ? err.message : 'Backend test failed');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-center">🎓 LectureScript Test</h1>

        {/* Backend Test */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Backend Test</h2>
          <button
            onClick={testBackend}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Test Backend Connection
          </button>
        </div>

        {/* Recording Controls */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Recording</h2>
          <div className="space-y-4">
            {!isRecording ? (
              <button
                onClick={startRecording}
                className="bg-red-500 text-white px-6 py-3 rounded-lg hover:bg-red-600 font-semibold"
              >
                🎙️ Start Recording
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
                📝 Transcribing audio...
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

        {/* Transcript Display */}
        {transcript && (
          <div className="bg-green-50 border border-green-200 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-2 text-green-800">✅ Transcript:</h3>
            <p className="text-gray-800 leading-relaxed">{transcript}</p>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
          <h3 className="font-semibold text-blue-800 mb-2">測試步驟：</h3>
          <ol className="list-decimal list-inside space-y-1 text-blue-700">
            <li>先按 "Test Backend Connection" 確保backend正常</li>
            <li>按 "Start Recording" 開始錄音</li>
            <li>說話 (可以中英混雜)</li>
            <li>按 "Stop Recording" 停止錄音</li>
            <li>等待transcription結果</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

export default TestApp;