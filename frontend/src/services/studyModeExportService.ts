// 🎯 LectureScript MVP - Study Mode Export Service
// Simplified export service for MVP study mode
// Author: Peter Levler

import type { TranscriptionSegment } from '../types/transcription';

interface ExportOptions {
  title?: string;
  includeTimestamps?: boolean;
  includeSpeakers?: boolean;
}

class StudyModeExportService {
  /**
   * Format timestamp to MM:SS
   */
  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Generate plain text transcript
   */
  generatePlainText(
    segments: TranscriptionSegment[],
    options: ExportOptions = {}
  ): string {
    const { includeTimestamps = true, includeSpeakers = true } = options;

    let text = '';

    segments.forEach((segment) => {
      let line = '';

      if (includeTimestamps) {
        line += `[${this.formatTime(segment.start)}] `;
      }

      if (includeSpeakers && segment.speaker) {
        line += `${segment.speaker}: `;
      }

      line += segment.text;

      text += line + '\n\n';
    });

    return text;
  }

  /**
   * Export as plain text file
   */
  async exportText(
    segments: TranscriptionSegment[],
    filename: string,
    options: ExportOptions = {}
  ): Promise<void> {
    const text = this.generatePlainText(segments, options);

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    this.downloadBlob(blob, filename);
  }

  /**
   * Export as HTML file with embedded CSS
   */
  async exportHTML(
    segments: TranscriptionSegment[],
    filename: string,
    options: ExportOptions = {}
  ): Promise<void> {
    const {
      title = 'Lecture Transcript',
      includeTimestamps = true,
      includeSpeakers = true,
    } = options;

    const html = this.generateHTML(segments, {
      title,
      includeTimestamps,
      includeSpeakers,
    });

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    this.downloadBlob(blob, filename);
  }

  /**
   * Generate self-contained HTML with embedded CSS
   */
  private generateHTML(
    segments: TranscriptionSegment[],
    options: ExportOptions
  ): string {
    const { title, includeTimestamps, includeSpeakers } = options;

    const totalDuration = segments.length > 0
      ? this.formatTime(segments[segments.length - 1].end)
      : '0:00';

    const segmentsHTML = segments
      .map((segment, idx) => {
        return `
        <div class="segment" id="segment-${idx}">
          <div class="segment-header">
            ${includeTimestamps ? `<span class="timestamp">${this.formatTime(segment.start)}</span>` : ''}
            ${includeSpeakers && segment.speaker ? `<span class="speaker">${segment.speaker}</span>` : ''}
          </div>
          <div class="segment-text">${this.escapeHTML(segment.text)}</div>
        </div>
      `;
      })
      .join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHTML(title)}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f9fafb;
      color: #1f2937;
      line-height: 1.6;
      padding: 0;
    }

    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 48px 24px;
      text-align: center;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }

    .header h1 {
      font-size: 32px;
      font-weight: 700;
      margin-bottom: 8px;
    }

    .header .subtitle {
      font-size: 14px;
      opacity: 0.9;
    }

    .header .meta {
      margin-top: 16px;
      font-size: 14px;
      opacity: 0.95;
    }

    .container {
      max-width: 900px;
      margin: 0 auto;
      padding: 32px 24px;
    }

    .info-card {
      background: white;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 24px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      border: 1px solid #e5e7eb;
    }

    .info-card h2 {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 12px;
      color: #1f2937;
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
    }

    .info-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      color: #6b7280;
    }

    .info-item span:first-child {
      font-size: 20px;
    }

    .transcript {
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      border: 1px solid #e5e7eb;
    }

    .transcript h2 {
      font-size: 20px;
      font-weight: 600;
      margin-bottom: 24px;
      color: #1f2937;
      padding-bottom: 16px;
      border-bottom: 2px solid #e5e7eb;
    }

    .segment {
      margin-bottom: 24px;
      padding-bottom: 24px;
      border-bottom: 1px solid #f3f4f6;
    }

    .segment:last-child {
      border-bottom: none;
      margin-bottom: 0;
      padding-bottom: 0;
    }

    .segment-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 8px;
    }

    .timestamp {
      font-family: 'Monaco', 'Menlo', monospace;
      font-size: 13px;
      font-weight: 600;
      color: #3b82f6;
      background: #eff6ff;
      padding: 4px 10px;
      borderRadius: 6px;
    }

    .speaker {
      font-size: 13px;
      font-weight: 600;
      color: #8b5cf6;
      background: #f5f3ff;
      padding: 4px 10px;
      border-radius: 6px;
    }

    .segment-text {
      font-size: 15px;
      line-height: 1.7;
      color: #374151;
      padding-left: 0;
    }

    .footer {
      text-align: center;
      padding: 32px 24px;
      color: #6b7280;
      font-size: 13px;
    }

    .footer a {
      color: #3b82f6;
      text-decoration: none;
    }

    .footer a:hover {
      text-decoration: underline;
    }

    @media print {
      body {
        background: white;
      }

      .header {
        background: #667eea;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      .info-card,
      .transcript {
        box-shadow: none;
        page-break-inside: avoid;
      }

      .segment {
        page-break-inside: avoid;
      }
    }

    @media (max-width: 640px) {
      .header {
        padding: 32px 16px;
      }

      .header h1 {
        font-size: 24px;
      }

      .container {
        padding: 24px 16px;
      }

      .info-grid {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>📚 ${this.escapeHTML(title)}</h1>
    <div class="subtitle">Lecture Transcript</div>
    <div class="meta">
      Generated on ${new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })}
    </div>
  </div>

  <div class="container">
    <div class="info-card">
      <h2>📊 Transcript Information</h2>
      <div class="info-grid">
        <div class="info-item">
          <span>📝</span>
          <span>${segments.length} segments</span>
        </div>
        <div class="info-item">
          <span>⏱️</span>
          <span>${totalDuration} duration</span>
        </div>
        <div class="info-item">
          <span>🌐</span>
          <span>Offline-ready HTML</span>
        </div>
      </div>
    </div>

    <div class="transcript">
      <h2>📖 Transcript</h2>
      ${segmentsHTML}
    </div>
  </div>

  <div class="footer">
    <p>
      Generated by <strong>LectureScript</strong> —
      <a href="https://lecturescript.app" target="_blank">lecturescript.app</a>
    </p>
    <p style="margin-top: 8px; font-size: 12px;">
      This file is self-contained and can be viewed offline.
    </p>
  </div>
</body>
</html>`;
  }

  /**
   * Escape HTML special characters
   */
  private escapeHTML(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Download blob as file
   */
  private downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

export const exportService = new StudyModeExportService();
export default exportService;