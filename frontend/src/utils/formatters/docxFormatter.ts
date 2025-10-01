import type { LectureSession, ExportOptions, TranscriptSegment } from '../../types';

export class DOCXFormatter {
  static async generateDOCX(
    session: LectureSession,
    segments: TranscriptSegment[],
    options: ExportOptions
  ): Promise<{ data: Blob; filename: string; mimeType: string }> {
    const { includeTimestamps, includeSummary, includeMetadata, layout = 'professional' } = options;

    // Generate Word-compatible XML content
    const wordXML = this.generateWordXML(session, segments, {
      includeTimestamps,
      includeSummary,
      includeMetadata,
      layout
    });

    // Create DOCX file structure
    const docxBlob = await this.createDOCXBlob(wordXML, session.name);

    return {
      data: docxBlob,
      filename: `${this.sanitizeFilename(session.name)}.docx`,
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    };
  }

  private static generateWordXML(
    session: LectureSession,
    segments: TranscriptSegment[],
    options: {
      includeTimestamps: boolean;
      includeSummary: boolean;
      includeMetadata: boolean;
      layout: string;
    }
  ): string {
    const { includeTimestamps, includeSummary, includeMetadata, layout } = options;

    // Word document XML structure
    let xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>`;

    // Title
    xml += this.createWordTitle(session.name);

    // Metadata
    if (includeMetadata) {
      xml += this.createWordMetadata(session);
    }

    // Summary
    if (includeSummary && session.summary) {
      xml += this.createWordSummary(session.summary);
    }

    // Transcript header
    xml += this.createWordHeader('完整逐字稿 Full Transcript');

    // Transcript content
    segments.forEach(segment => {
      xml += this.createWordParagraph(
        segment,
        includeTimestamps,
        layout
      );
    });

    // Footer
    xml += this.createWordFooter();

    xml += `
  </w:body>
</w:document>`;

    return xml;
  }

  private static createWordTitle(title: string): string {
    return `
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
        <w:spacing w:after="240"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:sz w:val="32"/>
          <w:szCs w:val="32"/>
          <w:b/>
          <w:color w:val="1F4E79"/>
        </w:rPr>
        <w:t>${this.escapeXML(title)}</w:t>
      </w:r>
    </w:p>`;
  }

  private static createWordMetadata(session: LectureSession): string {
    const startDate = new Date(session.startTime).toLocaleString('zh-HK');
    const duration = this.formatDuration(session.duration);
    const wordCount = session.segments.reduce((acc, seg) => acc + seg.text.split(' ').length, 0);
    const languageMap = {
      'zh': '中文',
      'en': 'English',
      'mixed': '中英文混合'
    };

    return `
    <w:p>
      <w:pPr>
        <w:spacing w:after="160"/>
        <w:shd w:val="clear" w:color="auto" w:fill="F2F2F2"/>
        <w:ind w:left="144" w:right="144"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:b/>
          <w:color w:val="2F5496"/>
        </w:rPr>
        <w:t>講座資訊 Lecture Information</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:pPr>
        <w:spacing w:after="80"/>
        <w:ind w:left="288"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:b/>
        </w:rPr>
        <w:t>日期 Date: </w:t>
      </w:r>
      <w:r>
        <w:t>${this.escapeXML(startDate)}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:pPr>
        <w:spacing w:after="80"/>
        <w:ind w:left="288"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:b/>
        </w:rPr>
        <w:t>時長 Duration: </w:t>
      </w:r>
      <w:r>
        <w:t>${duration}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:pPr>
        <w:spacing w:after="80"/>
        <w:ind w:left="288"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:b/>
        </w:rPr>
        <w:t>字數 Word Count: </w:t>
      </w:r>
      <w:r>
        <w:t>${wordCount} words</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:pPr>
        <w:spacing w:after="80"/>
        <w:ind w:left="288"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:b/>
        </w:rPr>
        <w:t>語言 Language: </w:t>
      </w:r>
      <w:r>
        <w:t>${languageMap[session.language] || session.language}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:pPr>
        <w:spacing w:after="240"/>
        <w:ind w:left="288"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:b/>
        </w:rPr>
        <w:t>成本 Cost: </w:t>
      </w:r>
      <w:r>
        <w:t>$${session.cost.toFixed(4)}</w:t>
      </w:r>
    </w:p>`;
  }

  private static createWordSummary(summary: string): string {
    return `
    <w:p>
      <w:pPr>
        <w:spacing w:after="160"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:sz w:val="24"/>
          <w:szCs w:val="24"/>
          <w:b/>
          <w:color w:val="2F5496"/>
        </w:rPr>
        <w:t>📋 講座摘要 Summary</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:pPr>
        <w:spacing w:after="240"/>
        <w:shd w:val="clear" w:color="auto" w:fill="E7F3FF"/>
        <w:ind w:left="144" w:right="144"/>
      </w:pPr>
      <w:r>
        <w:t>${this.escapeXML(summary)}</w:t>
      </w:r>
    </w:p>`;
  }

  private static createWordHeader(text: string): string {
    return `
    <w:p>
      <w:pPr>
        <w:spacing w:after="160"/>
        <w:pBdr>
          <w:bottom w:val="single" w:sz="6" w:space="1" w:color="2F5496"/>
        </w:pBdr>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:sz w:val="24"/>
          <w:szCs w:val="24"/>
          <w:b/>
          <w:color w:val="2F5496"/>
        </w:rPr>
        <w:t>${this.escapeXML(text)}</w:t>
      </w:r>
    </w:p>`;
  }

  private static createWordParagraph(
    segment: TranscriptSegment,
    includeTimestamps: boolean,
    layout: string
  ): string {
    let paragraph = `
    <w:p>
      <w:pPr>
        <w:spacing w:after="120"/>
      </w:pPr>`;

    // Add timestamp if requested
    if (includeTimestamps) {
      const timestamp = this.formatTimestamp(segment.timestamp);
      paragraph += `
      <w:r>
        <w:rPr>
          <w:shd w:val="clear" w:color="auto" w:fill="E3F2FD"/>
          <w:color w:val="1565C0"/>
          <w:sz w:val="16"/>
          <w:szCs w:val="16"/>
        </w:rPr>
        <w:t>[${timestamp}] </w:t>
      </w:r>`;
    }

    // Add speaker if available
    if (segment.speaker) {
      paragraph += `
      <w:r>
        <w:rPr>
          <w:b/>
          <w:color w:val="D32F2F"/>
        </w:rPr>
        <w:t>${this.escapeXML(segment.speaker)}: </w:t>
      </w:r>`;
    }

    // Add main text
    paragraph += `
      <w:r>
        <w:t>${this.escapeXML(segment.text)}</w:t>
      </w:r>
    </w:p>`;

    return paragraph;
  }

  private static createWordFooter(): string {
    const exportDate = new Date().toLocaleString('zh-HK');
    return `
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
        <w:spacing w:before="480"/>
        <w:pBdr>
          <w:top w:val="single" w:sz="6" w:space="1" w:color="CCCCCC"/>
        </w:pBdr>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:sz w:val="16"/>
          <w:szCs w:val="16"/>
          <w:color w:val="666666"/>
        </w:rPr>
        <w:t>Generated by Lecture Transcription PWA on ${exportDate}</w:t>
      </w:r>
    </w:p>`;
  }

  private static async createDOCXBlob(documentXML: string, title: string): Promise<Blob> {
    // For a full DOCX implementation, you would need to create a proper ZIP structure
    // with relationships, content types, etc. For now, we'll create a simple RTF file
    // that can be opened by Word

    const rtfContent = this.convertXMLToRTF(documentXML, title);
    return new Blob([rtfContent], {
      type: 'application/rtf'
    });
  }

  private static convertXMLToRTF(xml: string, title: string): string {
    // Simple RTF conversion for demonstration
    // In production, you'd want to use a proper DOCX library like docx.js
    let rtf = '{\\rtf1\\ansi\\deff0 {\\fonttbl {\\f0 Times New Roman;} {\\f1 Microsoft JhengHei;}}';
    rtf += '\\f1\\fs24'; // Set default font and size

    // Title
    rtf += `{\\b\\fs32\\qc ${this.escapeRTF(title)}}\\par\\par`;

    // Extract text content from XML (simplified)
    const textContent = xml.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    rtf += textContent.replace(/\n/g, '\\par');

    rtf += '}';
    return rtf;
  }

  private static formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  private static formatTimestamp(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  private static escapeXML(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private static escapeRTF(text: string): string {
    return text.replace(/[{}\\]/g, '\\$&');
  }

  private static sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-z0-9\u4e00-\u9fff]/gi, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .substring(0, 100);
  }
}