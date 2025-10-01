import type { LectureSession, ExportOptions, TranscriptSegment, BatchExportOptions, ExportProgress } from '../types';
import { formatDuration } from '../utils/audioProcessor';
import { PDFFormatter } from '../utils/formatters/pdfFormatter';
import { DOCXFormatter } from '../utils/formatters/docxFormatter';
import { JSONFormatter } from '../utils/formatters/jsonFormatter';

export class EnhancedExportService {
  private progressCallback?: (progress: ExportProgress) => void;
  private serverUrl: string;

  constructor(serverUrl = 'http://localhost:3001') {
    this.serverUrl = serverUrl;
  }

  setProgressCallback(callback: (progress: ExportProgress) => void) {
    this.progressCallback = callback;
  }

  async exportSession(
    session: LectureSession,
    options: ExportOptions
  ): Promise<{ data: string | Blob; filename: string; mimeType: string }> {
    this.updateProgress('preparing', 0, 'Preparing export...');

    const { format, includeTimestamps, includeSummary, includeMetadata, language } = options;

    try {
      this.updateProgress('processing', 20, 'Filtering segments...');
      const filteredSegments = this.filterSegmentsByLanguage(session.segments, language);

      this.updateProgress('generating', 40, `Generating ${format.toUpperCase()} export...`);

      let result: { data: string | Blob; filename: string; mimeType: string };

      switch (format) {
        case 'txt':
          result = this.exportAsText(session, filteredSegments, options);
          break;
        case 'md':
          result = this.exportAsMarkdown(session, filteredSegments, options);
          break;
        case 'pdf':
          result = await this.exportAsPDF(session, filteredSegments, options);
          break;
        case 'docx':
          result = await this.exportAsDOCX(session, filteredSegments, options);
          break;
        case 'json':
          result = this.exportAsJSON(session, filteredSegments, options);
          break;
        case 'notion':
          result = this.exportForNotion(session, filteredSegments, options);
          break;
        case 'gdocs':
          result = this.exportForGoogleDocs(session, filteredSegments, options);
          break;
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }

      this.updateProgress('completed', 100, 'Export completed successfully');
      return result;

    } catch (error) {
      this.updateProgress('error', 0, `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  async batchExport(options: BatchExportOptions): Promise<{ data: Blob; filename: string; mimeType: string }> {
    this.updateProgress('preparing', 0, 'Preparing batch export...');

    const { sessions: sessionIds, zipName, ...exportOptions } = options;
    const exportedFiles: Array<{ name: string; data: string | Blob; mimeType: string }> = [];

    try {
      // Load sessions (this would typically come from your storage service)
      const sessions = await this.loadSessions(sessionIds);

      let progress = 0;
      const progressStep = 80 / sessions.length;

      for (const session of sessions) {
        this.updateProgress('processing', progress, `Exporting ${session.name}...`);

        const result = await this.exportSession(session, exportOptions);
        exportedFiles.push({
          name: result.filename,
          data: result.data,
          mimeType: result.mimeType
        });

        progress += progressStep;
      }

      this.updateProgress('generating', 90, 'Creating archive...');

      // Create ZIP file
      const zipBlob = await this.createZipArchive(exportedFiles);
      const filename = zipName || `lecture_exports_${new Date().toISOString().split('T')[0]}.zip`;

      this.updateProgress('completed', 100, 'Batch export completed');

      return {
        data: zipBlob,
        filename,
        mimeType: 'application/zip'
      };

    } catch (error) {
      this.updateProgress('error', 0, `Batch export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  private async loadSessions(sessionIds: string[]): Promise<LectureSession[]> {
    // This would typically load from your storage service
    // For now, return empty array
    return [];
  }

  private async createZipArchive(files: Array<{ name: string; data: string | Blob; mimeType: string }>): Promise<Blob> {
    // Simple ZIP creation using JSZip library (would need to be installed)
    // For now, create a simple text-based archive

    let archiveContent = 'LECTURE EXPORTS ARCHIVE\n';
    archiveContent += '='.repeat(50) + '\n\n';

    for (const file of files) {
      archiveContent += `File: ${file.name}\n`;
      archiveContent += `Type: ${file.mimeType}\n`;
      archiveContent += '-'.repeat(30) + '\n';

      if (typeof file.data === 'string') {
        archiveContent += file.data;
      } else {
        archiveContent += '[Binary file content]\n';
      }

      archiveContent += '\n\n';
    }

    return new Blob([archiveContent], { type: 'text/plain' });
  }

  private updateProgress(status: ExportProgress['status'], progress: number, message: string) {
    if (this.progressCallback) {
      this.progressCallback({ status, progress, message });
    }
  }

  private filterSegmentsByLanguage(
    segments: TranscriptSegment[],
    language: 'zh' | 'en' | 'both'
  ): TranscriptSegment[] {
    if (language === 'both') {
      return segments;
    }

    return segments.filter(segment => {
      const isChineseText = /[\u4e00-\u9fff]/.test(segment.text);
      const isEnglishText = /[a-zA-Z]/.test(segment.text);

      if (language === 'zh') {
        return isChineseText;
      } else if (language === 'en') {
        return isEnglishText && !isChineseText;
      }

      return true;
    });
  }

  private exportAsText(
    session: LectureSession,
    segments: TranscriptSegment[],
    options: ExportOptions
  ): { data: string; filename: string; mimeType: string } {
    const content = this.generateTextContent(session, segments, options);
    return {
      data: content,
      filename: `${this.sanitizeFilename(session.name)}.txt`,
      mimeType: 'text/plain;charset=utf-8',
    };
  }

  private exportAsMarkdown(
    session: LectureSession,
    segments: TranscriptSegment[],
    options: ExportOptions
  ): { data: string; filename: string; mimeType: string } {
    const { includeTimestamps, includeSummary, includeMetadata, layout = 'professional' } = options;

    let markdown = `# ${session.name}\n\n`;

    // Add metadata
    if (includeMetadata) {
      markdown += this.generateMarkdownMetadata(session);
    }

    // Add summary
    if (includeSummary && session.summary) {
      markdown += `## 📋 Summary\n\n${session.summary}\n\n`;
    }

    // Add transcript
    markdown += `## 🎙️ Transcript\n\n`;

    segments.forEach((segment, index) => {
      if (layout === 'academic') {
        markdown += `### Segment ${index + 1}\n\n`;
      }

      if (includeTimestamps) {
        markdown += `**[${this.formatTimestamp(segment.timestamp)}]** `;
      }

      if (segment.speaker) {
        markdown += `**${segment.speaker}:** `;
      }

      markdown += `${segment.text}\n\n`;
    });

    // Add footer
    if (options.includeBranding) {
      markdown += `---\n\n*Generated by Lecture Transcription PWA on ${new Date().toLocaleString('zh-HK')}*\n`;
    }

    if (options.includeWatermark) {
      markdown += `\n> 📱 This transcript was generated using AI technology for Hong Kong university students.\n`;
    }

    return {
      data: markdown,
      filename: `${this.sanitizeFilename(session.name)}.md`,
      mimeType: 'text/markdown;charset=utf-8',
    };
  }

  private async exportAsPDF(
    session: LectureSession,
    segments: TranscriptSegment[],
    options: ExportOptions
  ): Promise<{ data: Blob; filename: string; mimeType: string }> {
    try {
      // Try server-side PDF generation first
      return await PDFFormatter.generateServerPDF(session, segments, options, this.serverUrl);
    } catch (error) {
      console.warn('Server PDF generation failed, falling back to client-side:', error);
      // Fallback to client-side generation
      return await PDFFormatter.generatePDF(session, segments, options);
    }
  }

  private async exportAsDOCX(
    session: LectureSession,
    segments: TranscriptSegment[],
    options: ExportOptions
  ): Promise<{ data: Blob; filename: string; mimeType: string }> {
    return await DOCXFormatter.generateDOCX(session, segments, options);
  }

  private exportAsJSON(
    session: LectureSession,
    segments: TranscriptSegment[],
    options: ExportOptions
  ): { data: string; filename: string; mimeType: string } {
    const { layout = 'standard' } = options;

    switch (layout) {
      case 'academic':
        return JSONFormatter.generateStructuredJSON(session, segments, options);
      case 'clean':
        return JSONFormatter.generateJSONLines(session, segments, options);
      case 'professional':
        return JSONFormatter.generateAPIFormat(session, segments, options);
      default:
        return JSONFormatter.generateJSON(session, segments, options);
    }
  }

  private exportForNotion(
    session: LectureSession,
    segments: TranscriptSegment[],
    options: ExportOptions
  ): { data: string; filename: string; mimeType: string } {
    let notionMarkdown = `# ${session.name}\n\n`;

    if (options.includeMetadata) {
      notionMarkdown += `> **Lecture Information**\n`;
      notionMarkdown += `> 📅 Date: ${new Date(session.startTime).toLocaleString('zh-HK')}\n`;
      notionMarkdown += `> ⏱️ Duration: ${this.formatDuration(session.duration)}\n`;
      notionMarkdown += `> 🗣️ Language: ${this.getLanguageDisplay(session.language)}\n`;
      notionMarkdown += `> 📝 Words: ${session.wordCount}\n`;
      notionMarkdown += `> 💰 Cost: $${session.cost.toFixed(4)}\n\n`;
    }

    if (options.includeSummary && session.summary) {
      notionMarkdown += `## 📝 Summary\n\n`;
      notionMarkdown += `<aside>\n💡 ${session.summary}\n</aside>\n\n`;
    }

    notionMarkdown += `## 📢 Full Transcript\n\n`;

    segments.forEach(segment => {
      if (options.includeTimestamps) {
        notionMarkdown += `**[${this.formatTimestamp(segment.timestamp)}]** `;
      }

      if (segment.speaker) {
        notionMarkdown += `**${segment.speaker}:** `;
      }

      notionMarkdown += `${segment.text}\n\n`;
    });

    notionMarkdown += `---\n\n`;
    notionMarkdown += `📱 *Generated by Lecture Transcription PWA*\n`;

    return {
      data: notionMarkdown,
      filename: `${this.sanitizeFilename(session.name)}_notion.md`,
      mimeType: 'text/markdown;charset=utf-8',
    };
  }

  private exportForGoogleDocs(
    session: LectureSession,
    segments: TranscriptSegment[],
    options: ExportOptions
  ): { data: string; filename: string; mimeType: string } {
    let html = `<!DOCTYPE html>
<html lang="zh-HK">
<head>
    <meta charset="UTF-8">
    <title>${session.name}</title>
    <style>
        body {
            font-family: 'Times New Roman', serif;
            line-height: 1.6;
            margin: 40px;
            color: #333;
        }
        h1 {
            color: #1a73e8;
            border-bottom: 2px solid #1a73e8;
            padding-bottom: 10px;
        }
        .metadata {
            background-color: #f8f9fa;
            padding: 15px;
            border-left: 4px solid #1a73e8;
            margin: 20px 0;
        }
        .timestamp {
            color: #666;
            font-weight: bold;
            background: #e3f2fd;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 0.9em;
        }
        .speaker {
            font-weight: bold;
            color: #d32f2f;
        }
        .summary {
            background-color: #e8f5e8;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            border-left: 4px solid #4caf50;
        }
        .transcript-segment {
            margin: 15px 0;
            padding: 10px 0;
            border-bottom: 1px solid #f0f0f0;
        }
    </style>
</head>
<body>`;

    html += `<h1>${session.name}</h1>`;

    if (options.includeMetadata) {
      html += `<div class="metadata">
        <h2>Lecture Information</h2>
        <p><strong>Date:</strong> ${new Date(session.startTime).toLocaleString('zh-HK')}</p>
        <p><strong>Duration:</strong> ${this.formatDuration(session.duration)}</p>
        <p><strong>Language:</strong> ${this.getLanguageDisplay(session.language)}</p>
        <p><strong>Word Count:</strong> ${session.wordCount}</p>
        <p><strong>Cost:</strong> $${session.cost.toFixed(4)}</p>
      </div>`;
    }

    if (options.includeSummary && session.summary) {
      html += `<div class="summary">
        <h2>📋 Summary</h2>
        <p>${session.summary}</p>
      </div>`;
    }

    html += `<h2>🎙️ Transcript</h2><div class="transcript">`;

    segments.forEach(segment => {
      html += `<div class="transcript-segment">`;

      if (options.includeTimestamps) {
        html += `<span class="timestamp">[${this.formatTimestamp(segment.timestamp)}]</span> `;
      }

      if (segment.speaker) {
        html += `<span class="speaker">${segment.speaker}:</span> `;
      }

      html += `${segment.text}`;
      html += `</div>`;
    });

    html += `</div>`;

    if (options.includeBranding) {
      html += `<hr><p><em>Generated by Lecture Transcription PWA on ${new Date().toLocaleString('zh-HK')}</em></p>`;
    }

    html += `</body></html>`;

    return {
      data: html,
      filename: `${this.sanitizeFilename(session.name)}.html`,
      mimeType: 'text/html;charset=utf-8',
    };
  }

  private generateTextContent(
    session: LectureSession,
    segments: TranscriptSegment[],
    options: ExportOptions
  ): string {
    let text = `${session.name}\n${'='.repeat(session.name.length)}\n\n`;

    if (options.includeMetadata) {
      text += `METADATA\n--------\n`;
      text += `Date: ${new Date(session.startTime).toLocaleString('zh-HK')}\n`;
      text += `Duration: ${this.formatDuration(session.duration)}\n`;
      text += `Language: ${this.getLanguageDisplay(session.language)}\n`;
      text += `Word Count: ${session.wordCount}\n`;
      text += `Cost: $${session.cost.toFixed(4)}\n\n`;
    }

    if (options.includeSummary && session.summary) {
      text += `SUMMARY\n-------\n${session.summary}\n\n`;
    }

    text += `TRANSCRIPT\n----------\n`;

    segments.forEach(segment => {
      const timestamp = options.includeTimestamps
        ? `[${this.formatTimestamp(segment.timestamp)}] `
        : '';

      const speaker = segment.speaker ? `${segment.speaker}: ` : '';

      text += `${timestamp}${speaker}${segment.text.trim()}\n\n`;
    });

    if (options.includeBranding) {
      text += `\n---\nGenerated by Lecture Transcription PWA\n`;
    }

    return text;
  }

  private generateMarkdownMetadata(session: LectureSession): string {
    return `## 📊 Lecture Information

| Field | Value |
|-------|-------|
| **Date** | ${new Date(session.startTime).toLocaleString('zh-HK')} |
| **Duration** | ${this.formatDuration(session.duration)} |
| **Language** | ${this.getLanguageDisplay(session.language)} |
| **Word Count** | ${session.wordCount} words |
| **Cost** | $${session.cost.toFixed(4)} |
| **Status** | ${session.status} |

`;
  }

  private formatTimestamp(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  private formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  private getLanguageDisplay(language: string): string {
    const languageMap = {
      'zh': '中文',
      'en': 'English',
      'mixed': '中英文混合'
    };
    return languageMap[language as keyof typeof languageMap] || language;
  }

  private sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-z0-9\u4e00-\u9fff]/gi, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .substring(0, 100);
  }

  // Utility method to download file
  downloadFile(data: string | Blob, filename: string, mimeType: string): void {
    const blob = typeof data === 'string' ? new Blob([data], { type: mimeType }) : data;
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  // Share via Web Share API (if available)
  async shareFile(
    session: LectureSession,
    options: ExportOptions
  ): Promise<boolean> {
    if (!navigator.share) {
      return false;
    }

    try {
      const { data, filename } = await this.exportSession(session, options);
      const blob = typeof data === 'string' ? new Blob([data], { type: 'text/plain' }) : data;
      const file = new File([blob], filename, { type: blob.type });

      await navigator.share({
        title: session.name,
        text: `Lecture transcript: ${session.name}`,
        files: [file],
      });

      return true;
    } catch (error) {
      console.error('Web Share failed:', error);
      return false;
    }
  }

  // Generate shareable summary for social media
  generateShareableText(session: LectureSession): string {
    const duration = this.formatDuration(session.duration);
    const wordCount = session.wordCount;

    return `📚 Just transcribed: "${session.name}"
⏱️ Duration: ${duration}
📝 Words: ${wordCount.toLocaleString()}
💰 Cost: $${session.cost.toFixed(4)}

#LectureNotes #Study #UniversityLife #HongKong #AI`;
  }
}