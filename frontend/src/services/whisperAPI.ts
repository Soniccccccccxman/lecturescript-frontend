import OpenAI from 'openai';
import type { TranscriptSegment } from '../types';
import { calculateAudioDuration } from '../utils/audioProcessor';

export class WhisperService {
  private openai: OpenAI | null = null;
  private apiKey: string = '';

  constructor(apiKey?: string) {
    if (apiKey) {
      this.setApiKey(apiKey);
    }
  }

  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
    this.openai = new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true, // Note: In production, use a backend proxy
    });
  }

  private validateApiKey(): void {
    if (!this.openai || !this.apiKey) {
      throw new Error('OpenAI API key is required. Please configure it in settings.');
    }
  }

  async transcribeAudio(
    audioBlob: Blob,
    options: {
      language?: string;
      prompt?: string;
      temperature?: number;
      timestamp_granularities?: string[];
    } = {}
  ): Promise<{
    text: string;
    segments: TranscriptSegment[];
    duration: number;
    language: string;
    cost: number;
  }> {
    this.validateApiKey();

    try {
      // Calculate audio duration for cost calculation
      const duration = await calculateAudioDuration(audioBlob);
      const durationMinutes = duration / 60;

      // Convert blob to file
      const file = new File([audioBlob], 'audio.webm', { type: audioBlob.type });

      const response = await this.openai!.audio.transcriptions.create({
        file,
        model: 'whisper-1',
        language: options.language || undefined,
        prompt: options.prompt || this.getOptimizedPrompt(),
        temperature: options.temperature || 0,
        response_format: 'verbose_json',
        timestamp_granularities: ['word'],
      });

      // Parse the response and create segments
      const segments = this.parseTranscriptionResponse(response);

      // Calculate cost (Whisper API charges $0.006 per minute)
      const cost = durationMinutes * 0.006;

      return {
        text: response.text,
        segments,
        duration,
        language: response.language || 'unknown',
        cost: Number(cost.toFixed(4)),
      };
    } catch (error) {
      console.error('Transcription failed:', error);

      if (error instanceof Error) {
        if (error.message.includes('api_key')) {
          throw new Error('Invalid API key. Please check your OpenAI API key in settings.');
        }
        if (error.message.includes('quota')) {
          throw new Error('API quota exceeded. Please check your OpenAI account billing.');
        }
        if (error.message.includes('rate_limit')) {
          throw new Error('Rate limit exceeded. Please wait a moment and try again.');
        }
      }

      throw new Error('Transcription failed. Please check your internet connection and try again.');
    }
  }

  async transcribeChunk(
    audioBlob: Blob,
    chunkIndex: number,
    totalChunks: number,
    previousContext?: string
  ): Promise<{
    text: string;
    segments: TranscriptSegment[];
    cost: number;
  }> {
    this.validateApiKey();

    try {
      const duration = await calculateAudioDuration(audioBlob);
      const durationMinutes = duration / 60;
      const file = new File([audioBlob], `chunk-${chunkIndex}.webm`, { type: audioBlob.type });

      // Create context-aware prompt for better continuity
      const contextPrompt = this.createContextPrompt(previousContext, chunkIndex, totalChunks);

      const response = await this.openai!.audio.transcriptions.create({
        file,
        model: 'whisper-1',
        prompt: contextPrompt,
        temperature: 0,
        response_format: 'verbose_json',
        timestamp_granularities: ['word'],
      });

      const segments = this.parseTranscriptionResponse(response, chunkIndex * 30); // Offset for chunk timing
      const cost = durationMinutes * 0.006;

      return {
        text: response.text,
        segments,
        cost: Number(cost.toFixed(4)),
      };
    } catch (error) {
      console.error(`Chunk ${chunkIndex} transcription failed:`, error);
      throw error;
    }
  }

  private parseTranscriptionResponse(
    response: any,
    timeOffset: number = 0
  ): TranscriptSegment[] {
    const segments: TranscriptSegment[] = [];

    if (response.words && Array.isArray(response.words)) {
      // Group words into sentences/segments
      let currentSegment: TranscriptSegment | null = null;

      for (const word of response.words) {
        const timestamp = (word.start || 0) + timeOffset;

        if (!currentSegment) {
          currentSegment = {
            id: `segment-${timestamp}`,
            text: word.word,
            timestamp,
            confidence: word.confidence,
          };
        } else {
          // End segment on punctuation or after 10 seconds
          const shouldEndSegment =
            /[.!?]$/.test(word.word) ||
            (timestamp - currentSegment.timestamp) > 10;

          if (shouldEndSegment) {
            currentSegment.text += word.word;
            segments.push(currentSegment);
            currentSegment = null;
          } else {
            currentSegment.text += word.word;
          }
        }
      }

      // Add final segment if exists
      if (currentSegment) {
        segments.push(currentSegment);
      }
    } else {
      // Fallback: create single segment
      segments.push({
        id: `segment-${timeOffset}`,
        text: response.text,
        timestamp: timeOffset,
        confidence: 1,
      });
    }

    return segments;
  }

  private getOptimizedPrompt(): string {
    return `This is a university lecture recording in Hong Kong. The speaker may switch between Cantonese and English.
Please transcribe accurately, maintaining the language switching patterns.
Common terms include: professor, student, assignment, exam, research, analysis, theory, concept, methodology.
Pay attention to academic terminology and proper nouns.`;
  }

  private createContextPrompt(
    previousContext?: string,
    chunkIndex?: number,
    totalChunks?: number
  ): string {
    let prompt = this.getOptimizedPrompt();

    if (previousContext && chunkIndex && chunkIndex > 0) {
      prompt += `\n\nPrevious context: "${previousContext.slice(-200)}"`;
    }

    if (chunkIndex !== undefined && totalChunks !== undefined) {
      prompt += `\n\nThis is chunk ${chunkIndex + 1} of ${totalChunks} from a continuous lecture.`;
    }

    return prompt;
  }

  // Language detection helper
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

  // Test API connection
  async testConnection(): Promise<boolean> {
    this.validateApiKey();

    try {
      // Create a minimal test audio blob (silence)
      const audioContext = new AudioContext();
      audioContext.createBuffer(1, 16000, 16000); // 1 second of silence

      // Instead of actual transcription, just test the API key
      const models = await this.openai!.models.list();

      return models.data.some(model => model.id === 'whisper-1');
    } catch (error) {
      console.error('API connection test failed:', error);
      return false;
    }
  }
}