import type { TranscriptSegment } from '../types';
import { backendService } from './backendAPI';

const BACKEND_URL = 'http://localhost:3001';

export class PdfBackendService {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || BACKEND_URL;
  }

  async uploadPdf(
    pdfFile: File
  ): Promise<{
    contextId: string;
    title: string;
    pageCount: number;
    extractedText: string;
    summary: string;
  }> {
    try {
      const formData = new FormData();
      formData.append('pdf', pdfFile);

      console.log('📄 Uploading PDF for context extraction...');

      const response = await fetch(`${this.baseUrl}/api/pdf/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'PDF upload failed');
      }

      console.log('✅ PDF uploaded and processed:', result.data);

      return {
        contextId: result.data.contextId,
        title: result.data.title,
        pageCount: result.data.pageCount,
        extractedText: result.data.extractedText,
        summary: result.data.summary,
      };

    } catch (error) {
      console.error('❌ PDF upload error:', error);
      throw error;
    }
  }

  async transcribeWithPdfContext(
    audioBlob: Blob,
    contextId: string,
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
    intelligentTitle: string;
    keyTopics: string[];
  }> {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      formData.append('contextId', contextId);

      if (options.language) {
        formData.append('language', options.language);
      }

      if (options.sessionName) {
        formData.append('sessionName', options.sessionName);
      }

      console.log('🎵 Sending audio for PDF-enhanced transcription...');

      const response = await fetch(`${this.baseUrl}/api/transcribe/enhanced`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Enhanced transcription failed');
      }

      console.log('✅ Enhanced transcription completed:', result.data);

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
        intelligentTitle: result.data.intelligentTitle || '',
        keyTopics: result.data.keyTopics || [],
      };

    } catch (error) {
      console.error('❌ Enhanced transcription error:', error);
      throw error;
    }
  }

  async getPdfContext(contextId: string): Promise<{
    title: string;
    extractedText: string;
    summary: string;
    pageCount: number;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/pdf/${contextId}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to get PDF context');
      }

      return result.data;

    } catch (error) {
      console.error('❌ Get PDF context error:', error);
      throw error;
    }
  }

  // Delegate to existing backend service for health checks and other methods
  async checkHealth(): Promise<boolean> {
    return backendService.checkHealth();
  }
}

// Export singleton instance
export const pdfBackendService = new PdfBackendService();