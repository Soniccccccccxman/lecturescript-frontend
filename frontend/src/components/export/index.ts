// Export Components - Comprehensive lecture transcription export system
// Designed for Hong Kong university students and academic use

// Main Export Components
export { ExportModal } from './ExportModal';
export { BatchExportModal } from './BatchExportModal';
export { ExportProgressModal } from './ExportProgressModal';

// Integration Components
export {
  ExportIntegration,
  EnhancedLibraryView,
  QuickExportButton,
  ExportMenu
} from './ExportIntegration';

// Example Implementation
export { default as ExportExample } from './ExportExample';

// Services
export { EnhancedExportService } from '../../services/enhancedExportService';

// Formatters
export { PDFFormatter } from '../../utils/formatters/pdfFormatter';
export { DOCXFormatter } from '../../utils/formatters/docxFormatter';
export { JSONFormatter } from '../../utils/formatters/jsonFormatter';
export { TemplateEngine } from '../../utils/formatters/templateEngine';

// Types (re-export for convenience)
export type {
  ExportOptions,
  ExportProgress,
  BatchExportOptions
} from '../../types';

/*
Usage Examples:

1. Single Export Button:
   <QuickExportButton recording={recording} variant="button" showText />

2. Export Modal:
   <ExportModal
     isOpen={isOpen}
     onClose={() => setIsOpen(false)}
     session={lectureSession}
   />

3. Batch Export:
   <BatchExportModal
     isOpen={isOpen}
     onClose={() => setIsOpen(false)}
     sessions={lectureSessions}
   />

4. Library Integration:
   <EnhancedLibraryView
     theme={theme}
     selectedRecordings={selected}
     enableBatchExport={true}
   >
     <LibraryView theme={theme} />
   </EnhancedLibraryView>

5. Export Menu in Header:
   <ExportMenu
     recordings={allRecordings}
     selectedRecordings={selectedRecordings}
   />

6. Progress Tracking:
   <ExportProgressModal
     isOpen={isOpen}
     onClose={() => setIsOpen(false)}
     jobId={exportJobId}
     serverUrl="http://localhost:3001"
   />

Export Formats Supported:
- 📄 PDF (Professional, Academic, Clean layouts)
- 📝 DOCX (Microsoft Word format)
- 📃 TXT (Plain text with formatting)
- 📋 Markdown (Technical documentation)
- 💾 JSON (Structured data, API format, JSONL)
- 📚 Notion (Optimized for Notion import)
- 📄 Google Docs (HTML format)
- 📦 Batch ZIP (Multiple files archived)

Features:
- ✅ Professional Hong Kong academic styling
- ✅ Traditional Chinese font support
- ✅ Cantonese/English mixed content
- ✅ Real-time progress tracking
- ✅ Server-side PDF generation
- ✅ Batch export with compression
- ✅ Responsive mobile design
- ✅ Error handling and recovery
- ✅ Watermarking and branding options
- ✅ Multiple layout templates
*/