import type { TranscriptSegment } from '../types';

const BACKEND_URL = 'http://localhost:3001';

export class StreamingTranscriptionService {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || BACKEND_URL;
  }

  async transcribeStreamChunk(
    audioBlob: Blob,
    contextId: string,
    chunkIndex: number,
    sessionId: string,
    isFirst: boolean = false
  ): Promise<{
    text: string;
    chunkIndex: number;
    sessionId: string;
    segments: TranscriptSegment[];
    duration: number;
    language: string;
    cost: number;
    timestamp: string;
  }> {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, `chunk_${chunkIndex}.webm`);
      formData.append('contextId', contextId);
      formData.append('chunkIndex', chunkIndex.toString());
      formData.append('sessionId', sessionId);
      formData.append('isFirst', isFirst.toString());

      console.log(`🌊 Sending audio chunk ${chunkIndex} for streaming transcription...`);

      const response = await fetch(`${this.baseUrl}/api/transcribe/stream`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Streaming transcription failed');
      }

      console.log(`✅ Chunk ${chunkIndex} transcribed:`, result.data.text.substring(0, 50) + '...');

      const segments: TranscriptSegment[] = result.data.segments?.map((seg: any, index: number) => ({
        id: `chunk-${chunkIndex}-segment-${index}`,
        text: seg.text || '',
        timestamp: seg.start || 0,
        confidence: seg.confidence || 1,
      })) || [{
        id: `chunk-${chunkIndex}-segment-0`,
        text: result.data.text,
        timestamp: 0,
        confidence: 1,
      }];

      return {
        text: result.data.text,
        chunkIndex: result.data.chunkIndex,
        sessionId: result.data.sessionId,
        segments,
        duration: result.data.duration || 0,
        language: result.data.language || 'unknown',
        cost: result.data.cost || 0,
        timestamp: result.data.timestamp,
      };

    } catch (error) {
      console.error(`❌ Streaming transcription error for chunk ${chunkIndex}:`, error);
      throw error;
    }
  }

  generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const streamingService = new StreamingTranscriptionService();