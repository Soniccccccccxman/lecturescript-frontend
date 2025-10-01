import type { TranscriptSegment } from '../types';

const BACKEND_URL = 'http://localhost:3001';

export class BackendService {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || BACKEND_URL;
  }

  async transcribeAudio(
    audioBlob: Blob,
    options: {
      language?: string;
      sessionName?: string;
    } = {}
  ): Promise<{
    text: string;
    segments: TranscriptSegment[];
    duration: number;
    language: string;
    cost: number;
  }> {
    try {
      // Create FormData to send audio file
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      if (options.language) {
        formData.append('language', options.language);
      }

      if (options.sessionName) {
        formData.append('sessionName', options.sessionName);
      }

      console.log('🎵 Sending audio to backend for transcription...');

      const response = await fetch(`${this.baseUrl}/api/transcribe`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Transcription failed');
      }

      console.log('✅ Transcription completed:', result.data);

      // Convert response to expected format
      const segments: TranscriptSegment[] = result.data.segments?.map((seg: any, index: number) => ({
        id: `segment-${index}`,
        text: seg.text || '',
        timestamp: seg.start || 0,
        confidence: seg.confidence || 1,
      })) || [{
        id: 'segment-0',
        text: result.data.text,
        timestamp: 0,
        confidence: 1,
      }];

      return {
        text: result.data.text,
        segments,
        duration: result.data.duration || 0,
        language: result.data.language || 'unknown',
        cost: result.data.cost || 0,
      };

    } catch (error) {
      console.error('❌ Backend transcription error:', error);
      throw error;
    }
  }

  async generateSummary(
    text: string,
    type: 'brief' | 'detailed' | 'key_points' | 'academic' = 'brief'
  ): Promise<{
    summary: string;
    type: string;
    cost: number;
    tokensUsed: number;
  }> {
    try {
      console.log(`📝 Generating ${type} summary...`);

      const response = await fetch(`${this.baseUrl}/api/summarize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          type,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Summary generation failed');
      }

      console.log('✅ Summary generated:', result.data);

      return {
        summary: result.data.summary,
        type: result.data.type,
        cost: result.data.cost || 0,
        tokensUsed: result.data.tokens_used || 0,
      };

    } catch (error) {
      console.error('❌ Backend summary error:', error);
      throw error;
    }
  }

  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/health`);
      const result = await response.json();
      return result.success && result.status === 'healthy';
    } catch (error) {
      console.error('❌ Backend health check failed:', error);
      return false;
    }
  }

  // Language detection helper (client-side)
  detectLanguage(text: string): 'zh' | 'en' | 'mixed' {
    const chineseChars = text.match(/[\u4e00-\u9fff]/g) || [];
    const englishWords = text.match(/[a-zA-Z]+/g) || [];

    const chineseRatio = chineseChars.length / text.length;
    const englishRatio = englishWords.join('').length / text.length;

    if (chineseRatio > 0.3 && englishRatio > 0.3) {
      return 'mixed';
    } else if (chineseRatio > englishRatio) {
      return 'zh';
    } else {
      return 'en';
    }
  }
}

// Export singleton instance
export const backendService = new BackendService();