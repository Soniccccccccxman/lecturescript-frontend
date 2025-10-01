import type { LectureSession, ExportOptions } from '../../types';
import { TemplateEngine, type TemplateData } from './templateEngine';

// Simple Mustache-like template engine
class MustacheRenderer {
  static render(template: string, data: any): string {
    return template.replace(/\{\{\{([^}]+)\}\}\}/g, (match, key) => {
      return this.getValue(data, key.trim()) || '';
    }).replace(/\{\{#([^}]+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (match, key, content) => {
      const value = this.getValue(data, key.trim());
      if (Array.isArray(value)) {
        return value.map(item => this.render(content, item)).join('');
      } else if (value) {
        return this.render(content, data);
      }
      return '';
    }).replace(/\{\{([^}]+)\}\}/g, (match, key) => {
      const value = this.getValue(data, key.trim());
      return this.escapeHtml(value) || '';
    });
  }

  private static getValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private static escapeHtml(str: any): string {
    if (typeof str !== 'string') return String(str || '');
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

export class PDFFormatter {
  static async generatePDF(
    session: LectureSession,
    segments: any[],
    options: ExportOptions
  ): Promise<{ data: Blob; filename: string; mimeType: string }> {
    const templateData = TemplateEngine.generateTemplateData(session, segments, options);

    // Select template based on layout
    let template: string;
    switch (options.layout) {
      case 'academic':
        template = TemplateEngine.getAcademicTemplate();
        break;
      case 'clean':
        template = TemplateEngine.getCleanTemplate();
        break;
      case 'professional':
      default:
        template = TemplateEngine.getProfessionalTemplate();
        break;
    }

    // Render HTML with template data
    const html = MustacheRenderer.render(template, templateData);

    // For now, we'll use the browser's print functionality to generate PDF
    // In a production environment, you might want to use a server-side solution
    const pdfBlob = await this.htmlToPdf(html);

    return {
      data: pdfBlob,
      filename: `${this.sanitizeFilename(session.name)}.pdf`,
      mimeType: 'application/pdf'
    };
  }

  private static async htmlToPdf(html: string): Promise<Blob> {
    // Create a temporary iframe to render the HTML
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.left = '-9999px';
    iframe.style.width = '210mm';
    iframe.style.height = '297mm';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument!;
    iframeDoc.open();
    iframeDoc.write(html);
    iframeDoc.close();

    // Wait for fonts and styles to load
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Use the Print API to generate PDF
    return new Promise((resolve, reject) => {
      try {
        // For now, we'll create a simple fallback
        // In production, you'd want to use a proper PDF generation library
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
          reject(new Error('Could not open print window'));
          return;
        }

        printWindow.document.write(html);
        printWindow.document.close();

        // Add print styles
        const style = printWindow.document.createElement('style');
        style.textContent = `
          @media print {
            @page {
              size: A4;
              margin: 20mm;
            }
            body {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          }
        `;
        printWindow.document.head.appendChild(style);

        // Trigger print dialog
        printWindow.onload = () => {
          printWindow.print();
          setTimeout(() => {
            printWindow.close();
            document.body.removeChild(iframe);
          }, 100);
        };

        // For now, return the HTML as a blob
        // This is a fallback - in production you'd generate actual PDF
        const blob = new Blob([html], { type: 'text/html' });
        resolve(blob);
      } catch (error) {
        document.body.removeChild(iframe);
        reject(error);
      }
    });
  }

  // Server-side PDF generation function (for backend implementation)
  static async generateServerPDF(
    session: LectureSession,
    segments: any[],
    options: ExportOptions,
    serverUrl: string
  ): Promise<{ data: Blob; filename: string; mimeType: string }> {
    const templateData = TemplateEngine.generateTemplateData(session, segments, options);

    try {
      const response = await fetch(`${serverUrl}/api/export/pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          templateData,
          layout: options.layout || 'professional',
          options: {
            format: 'A4',
            margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
            printBackground: true,
            preferCSSPageSize: true
          }
        })
      });

      if (!response.ok) {
        throw new Error(`PDF generation failed: ${response.statusText}`);
      }

      const pdfBlob = await response.blob();

      return {
        data: pdfBlob,
        filename: `${this.sanitizeFilename(session.name)}.pdf`,
        mimeType: 'application/pdf'
      };
    } catch (error) {
      console.error('Server PDF generation failed:', error);
      // Fallback to client-side generation
      return this.generatePDF(session, segments, options);
    }
  }

  private static sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-z0-9\u4e00-\u9fff]/gi, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .substring(0, 100);
  }
}