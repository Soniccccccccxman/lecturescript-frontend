import type { LectureSession, ExportOptions, TranscriptSegment } from '../../types';

export interface JSONExportData {
  metadata: {
    title: string;
    id: string;
    startTime: number;
    endTime?: number;
    duration: number;
    language: string;
    wordCount: number;
    cost: number;
    status: string;
    exportDate: string;
    exportOptions: ExportOptions;
    generator: {
      name: string;
      version: string;
      url?: string;
    };
  };
  summary?: string;
  segments: Array<{
    id: string;
    timestamp: number;
    timestampFormatted: string;
    text: string;
    confidence?: number;
    language?: string;
    speaker?: string;
    wordCount: number;
    characterCount: number;
  }>;
  statistics: {
    totalSegments: number;
    totalWords: number;
    totalCharacters: number;
    averageConfidence?: number;
    languageDistribution: Record<string, number>;
    speakerDistribution?: Record<string, number>;
    timeline: {
      startTime: number;
      endTime: number;
      duration: number;
    };
  };
  export: {
    format: string;
    timestamp: string;
    fileSize: number;
    checksum?: string;
  };
}

export class JSONFormatter {
  static generateJSON(
    session: LectureSession,
    segments: TranscriptSegment[],
    options: ExportOptions
  ): { data: string; filename: string; mimeType: string } {
    const exportData = this.createJSONStructure(session, segments, options);
    const jsonString = JSON.stringify(exportData, null, 2);

    return {
      data: jsonString,
      filename: `${this.sanitizeFilename(session.name)}.json`,
      mimeType: 'application/json;charset=utf-8'
    };
  }

  static generateJSONLines(
    session: LectureSession,
    segments: TranscriptSegment[],
    options: ExportOptions
  ): { data: string; filename: string; mimeType: string } {
    // JSON Lines format - each segment as a separate line
    const metadata = {
      type: 'metadata',
      ...this.createMetadata(session, options)
    };

    let jsonLines = JSON.stringify(metadata) + '\n';

    if (session.summary && options.includeSummary) {
      const summaryObj = {
        type: 'summary',
        content: session.summary,
        timestamp: new Date().toISOString()
      };
      jsonLines += JSON.stringify(summaryObj) + '\n';
    }

    // Add each segment as a line
    segments.forEach(segment => {
      const segmentObj = {
        type: 'segment',
        id: segment.id,
        timestamp: segment.timestamp,
        timestampFormatted: this.formatTimestamp(segment.timestamp),
        text: segment.text,
        confidence: segment.confidence,
        language: segment.language,
        speaker: segment.speaker,
        wordCount: segment.text.split(' ').length,
        characterCount: segment.text.length
      };
      jsonLines += JSON.stringify(segmentObj) + '\n';
    });

    return {
      data: jsonLines,
      filename: `${this.sanitizeFilename(session.name)}.jsonl`,
      mimeType: 'application/x-jsonlines;charset=utf-8'
    };
  }

  static generateStructuredJSON(
    session: LectureSession,
    segments: TranscriptSegment[],
    options: ExportOptions
  ): { data: string; filename: string; mimeType: string } {
    // Structured format for research/analysis
    const structure = {
      header: this.createMetadata(session, options),
      content: {
        summary: session.summary && options.includeSummary ? {
          text: session.summary,
          wordCount: session.summary.split(' ').length,
          characterCount: session.summary.length
        } : undefined,
        transcript: {
          segments: segments.map(segment => ({
            id: segment.id,
            time: {
              seconds: segment.timestamp,
              formatted: this.formatTimestamp(segment.timestamp),
              milliseconds: Math.round(segment.timestamp * 1000)
            },
            content: {
              text: segment.text,
              words: segment.text.split(' '),
              wordCount: segment.text.split(' ').length,
              characterCount: segment.text.length,
              sentences: this.splitIntoSentences(segment.text)
            },
            metadata: {
              confidence: segment.confidence,
              language: segment.language,
              speaker: segment.speaker
            }
          })),
          statistics: this.calculateStatistics(segments)
        }
      },
      export: {
        timestamp: new Date().toISOString(),
        format: 'structured-json',
        options: options,
        generator: {
          name: 'Lecture Transcription PWA',
          version: '1.0.0'
        }
      }
    };

    const jsonString = JSON.stringify(structure, null, 2);

    return {
      data: jsonString,
      filename: `${this.sanitizeFilename(session.name)}_structured.json`,
      mimeType: 'application/json;charset=utf-8'
    };
  }

  private static createJSONStructure(
    session: LectureSession,
    segments: TranscriptSegment[],
    options: ExportOptions
  ): JSONExportData {
    const statistics = this.calculateStatistics(segments);
    const jsonString = JSON.stringify({ session, segments, options }, null, 2);

    return {
      metadata: this.createMetadata(session, options),
      summary: session.summary && options.includeSummary ? session.summary : undefined,
      segments: segments.map(segment => ({
        id: segment.id,
        timestamp: segment.timestamp,
        timestampFormatted: this.formatTimestamp(segment.timestamp),
        text: segment.text,
        confidence: segment.confidence,
        language: segment.language,
        speaker: segment.speaker,
        wordCount: segment.text.split(' ').length,
        characterCount: segment.text.length
      })),
      statistics,
      export: {
        format: 'json',
        timestamp: new Date().toISOString(),
        fileSize: new Blob([jsonString]).size
      }
    };
  }

  private static createMetadata(session: LectureSession, options: ExportOptions) {
    return {
      title: session.name,
      id: session.id,
      startTime: session.startTime,
      endTime: session.endTime,
      duration: session.duration,
      language: session.language,
      wordCount: session.wordCount,
      cost: session.cost,
      status: session.status,
      exportDate: new Date().toISOString(),
      exportOptions: options,
      generator: {
        name: 'Lecture Transcription PWA',
        version: '1.0.0',
        url: 'https://lecture-transcription.app'
      }
    };
  }

  private static calculateStatistics(segments: TranscriptSegment[]) {
    const totalWords = segments.reduce((acc, seg) => acc + seg.text.split(' ').length, 0);
    const totalCharacters = segments.reduce((acc, seg) => acc + seg.text.length, 0);
    const confidenceValues = segments.filter(seg => seg.confidence !== undefined).map(seg => seg.confidence!);
    const averageConfidence = confidenceValues.length > 0
      ? confidenceValues.reduce((acc, conf) => acc + conf, 0) / confidenceValues.length
      : undefined;

    // Language distribution
    const languageDistribution: Record<string, number> = {};
    segments.forEach(seg => {
      if (seg.language) {
        languageDistribution[seg.language] = (languageDistribution[seg.language] || 0) + 1;
      }
    });

    // Speaker distribution
    const speakerDistribution: Record<string, number> = {};
    segments.forEach(seg => {
      if (seg.speaker) {
        speakerDistribution[seg.speaker] = (speakerDistribution[seg.speaker] || 0) + 1;
      }
    });

    const timeline = {
      startTime: segments.length > 0 ? segments[0].timestamp : 0,
      endTime: segments.length > 0 ? segments[segments.length - 1].timestamp : 0,
      duration: segments.length > 0 ? segments[segments.length - 1].timestamp - segments[0].timestamp : 0
    };

    return {
      totalSegments: segments.length,
      totalWords,
      totalCharacters,
      averageConfidence,
      languageDistribution,
      speakerDistribution: Object.keys(speakerDistribution).length > 0 ? speakerDistribution : undefined,
      timeline
    };
  }

  private static splitIntoSentences(text: string): string[] {
    // Simple sentence splitting - can be enhanced with NLP libraries
    return text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0);
  }

  private static formatTimestamp(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  private static sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-z0-9\u4e00-\u9fff]/gi, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .substring(0, 100);
  }

  // Generate API-compatible format for external integrations
  static generateAPIFormat(
    session: LectureSession,
    segments: TranscriptSegment[],
    options: ExportOptions
  ): { data: string; filename: string; mimeType: string } {
    const apiData = {
      version: '1.0',
      type: 'lecture-transcript',
      data: {
        lecture: {
          id: session.id,
          title: session.name,
          language: session.language,
          duration: session.duration,
          metadata: {
            startTime: new Date(session.startTime).toISOString(),
            endTime: session.endTime ? new Date(session.endTime).toISOString() : undefined,
            cost: session.cost,
            status: session.status
          }
        },
        transcript: segments.map(segment => ({
          id: segment.id,
          start: segment.timestamp,
          text: segment.text,
          confidence: segment.confidence,
          language: segment.language,
          speaker: segment.speaker
        })),
        summary: session.summary && options.includeSummary ? session.summary : undefined
      },
      meta: {
        exportedAt: new Date().toISOString(),
        exportOptions: options,
        totalSegments: segments.length,
        totalDuration: session.duration
      }
    };

    return {
      data: JSON.stringify(apiData, null, 2),
      filename: `${this.sanitizeFilename(session.name)}_api.json`,
      mimeType: 'application/json;charset=utf-8'
    };
  }
}