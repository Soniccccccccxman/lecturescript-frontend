# 📄 Comprehensive Export System for Lecture Transcription PWA

A professional-grade export system designed specifically for Hong Kong university students, supporting multiple formats with academic styling and Traditional Chinese font optimization.

## 🎯 Features

### Export Formats
- **📄 PDF** - Professional documents with multiple layout templates
- **📝 DOCX** - Microsoft Word format with academic styling
- **📃 TXT** - Clean plain text with optional timestamps
- **📋 Markdown** - Technical documentation format
- **💾 JSON** - Structured data (standard, API, JSONL formats)
- **📚 Notion** - Optimized for Notion workspace import
- **📄 Google Docs** - HTML format for Google Docs compatibility
- **📦 Batch ZIP** - Multiple lectures exported as compressed archive

### Professional Styling
- **Academic Layout** - University paper format with proper citations
- **Professional Layout** - Corporate meeting notes style
- **Clean Layout** - Minimal design for easy reading
- **Meeting Notes** - Structured format for business use

### Hong Kong Specific Features
- **Traditional Chinese Font Support** - Optimized rendering
- **Cantonese/English Mixed Content** - Code-switching support
- **Hong Kong Academic Standards** - University-compliant formatting
- **Local Date/Time Formatting** - HK timezone and formats

## 🚀 Quick Start

### 1. Basic Export Button

```tsx
import { QuickExportButton } from './components/export';

<QuickExportButton
  recording={recording}
  variant="button"
  showText
/>
```

### 2. Export Modal

```tsx
import { ExportModal } from './components/export';

const [exportModalOpen, setExportModalOpen] = useState(false);

<ExportModal
  isOpen={exportModalOpen}
  onClose={() => setExportModalOpen(false)}
  session={lectureSession}
/>
```

### 3. Batch Export

```tsx
import { BatchExportModal } from './components/export';

<BatchExportModal
  isOpen={batchModalOpen}
  onClose={() => setBatchModalOpen(false)}
  sessions={selectedSessions}
/>
```

### 4. Library Integration

```tsx
import { EnhancedLibraryView } from './components/export';

<EnhancedLibraryView
  theme={theme}
  selectedRecordings={selectedRecordings}
  enableBatchExport={true}
>
  <LibraryView theme={theme} />
</EnhancedLibraryView>
```

## 📁 File Structure

```
src/
├── components/export/
│   ├── ExportModal.tsx              # Main export dialog
│   ├── BatchExportModal.tsx         # Batch export interface
│   ├── ExportProgressModal.tsx      # Real-time progress tracking
│   ├── ExportIntegration.tsx        # Integration components
│   ├── ExportExample.tsx           # Complete usage example
│   └── index.ts                    # Main exports
├── services/
│   └── enhancedExportService.ts     # Core export logic
├── utils/formatters/
│   ├── templateEngine.ts           # Template rendering
│   ├── pdfFormatter.ts            # PDF generation
│   ├── docxFormatter.ts           # Word document creation
│   └── jsonFormatter.ts           # JSON data formats
└── types/
    └── index.ts                    # Type definitions
```

## 🔧 Backend Setup

### 1. Install Dependencies

```bash
cd lecture-transcription-backend
npm install puppeteer archiver
```

### 2. Add Export Endpoints

Add the export endpoints to your Express server:

```javascript
// Copy content from export-endpoints.js to your main server file
const puppeteer = require('puppeteer');
const archiver = require('archiver');

// PDF Export Endpoint
app.post('/api/export/pdf', async (req, res) => {
  // Implementation in export-endpoints.js
});

// Batch Export Endpoint
app.post('/api/export/batch', async (req, res) => {
  // Implementation in export-endpoints.js
});

// Progress Tracking
app.post('/api/export/start', async (req, res) => {
  // Implementation in export-endpoints.js
});
```

### 3. Server Configuration

Ensure your server supports:
- CORS for export requests
- File upload handling
- PDF generation with Puppeteer
- ZIP archive creation

## 💡 Usage Examples

### Individual Export

```tsx
import { QuickExportButton } from './components/export';

// Icon button (for cards)
<QuickExportButton recording={recording} variant="icon" />

// Full button with text
<QuickExportButton recording={recording} variant="button" showText />

// Text link style
<QuickExportButton recording={recording} variant="text" />
```

### Header Export Menu

```tsx
import { ExportMenu } from './components/export';

<ExportMenu
  recordings={allRecordings}
  selectedRecordings={selectedRecordings}
  theme={theme}
/>
```

### Progress Monitoring

```tsx
import { ExportProgressModal } from './components/export';

<ExportProgressModal
  isOpen={progressModalOpen}
  onClose={() => setProgressModalOpen(false)}
  jobId={exportJobId}
  serverUrl="http://localhost:3001"
/>
```

### Custom Export Service

```tsx
import { EnhancedExportService } from './services/enhancedExportService';

const exportService = new EnhancedExportService('http://localhost:3001');

// Set progress callback
exportService.setProgressCallback((progress) => {
  console.log(`Export progress: ${progress.progress}%`);
});

// Single export
const result = await exportService.exportSession(session, {
  format: 'pdf',
  layout: 'academic',
  includeTimestamps: true,
  includeSummary: true,
  includeMetadata: true,
  language: 'both'
});

// Download file
exportService.downloadFile(result.data, result.filename, result.mimeType);
```

## 🎨 Layout Templates

### Academic Template
- University paper format
- Professional typography
- Proper spacing and margins
- Traditional Chinese font support
- Citation-ready styling

### Professional Template
- Corporate meeting style
- Clean information cards
- Gradient headers
- Business-appropriate colors

### Clean Template
- Minimal design
- Apple-style typography
- Simple structure
- High readability

## 🌐 Internationalization

### Language Support
```tsx
const exportOptions = {
  language: 'both',     // Both Chinese and English
  language: 'zh',       // Chinese only
  language: 'en',       // English only
};
```

### Font Optimization
- **Noto Sans TC** - Traditional Chinese
- **Inter** - English content
- **System fonts** - Fallback support
- **Print optimization** - PDF-specific fonts

## 📊 Export Options

### Format Options
```tsx
interface ExportOptions {
  format: 'txt' | 'md' | 'docx' | 'pdf' | 'json' | 'notion' | 'gdocs';
  includeTimestamps: boolean;
  includeSummary: boolean;
  includeMetadata: boolean;
  language: 'zh' | 'en' | 'both';
  layout?: 'academic' | 'meeting' | 'clean' | 'professional';
  includeBranding?: boolean;
  includeWatermark?: boolean;
}
```

### Batch Export Options
```tsx
interface BatchExportOptions extends ExportOptions {
  sessions: string[];           // Session IDs
  zipName?: string;            // Custom archive name
}
```

## 🚨 Error Handling

### Client-Side Errors
- Network connectivity issues
- Invalid session data
- Unsupported formats
- File size limitations

### Server-Side Fallbacks
- PDF generation fallback to client-side
- Retry mechanisms for failed exports
- Progress tracking with error recovery

### User Experience
- Clear error messages in Traditional Chinese and English
- Retry buttons for failed exports
- Progress indicators with status updates
- Download alternatives when sharing fails

## 🔐 Security Considerations

### Data Protection
- No sensitive data stored on server
- Temporary file cleanup
- Export job expiration (1 minute)
- Secure file download URLs

### Content Validation
- Session data validation
- Export option sanitization
- File size limits
- Rate limiting on export endpoints

## 📱 Mobile Optimization

### Responsive Design
- Touch-friendly export buttons
- Mobile-optimized modal dialogs
- Responsive export options layout
- Optimized for Hong Kong mobile usage

### Performance
- Lazy loading of export components
- Optimized bundle sizes
- Progressive enhancement
- Offline export capabilities

## 🎓 Academic Features

### University Standards
- APA-style formatting options
- Academic paper layouts
- Citation-ready exports
- Professor-friendly formats

### Hong Kong Universities
- CUHK/HKU style guides
- Traditional Chinese academic formatting
- Local academic standards compliance
- University logo placeholder support

## 🔧 Development

### Adding New Formats

1. Create formatter in `utils/formatters/`
2. Add format to ExportOptions type
3. Update EnhancedExportService switch statement
4. Add UI option in ExportModal
5. Test with sample data

### Custom Templates

1. Add template function to TemplateEngine
2. Update template selection logic
3. Add layout option to UI
4. Test across formats

### Extending Backend

1. Add new endpoint to export-endpoints.js
2. Update client service calls
3. Add progress tracking if needed
4. Test error handling

## 🐛 Troubleshooting

### Common Issues

**PDF Generation Fails**
- Check Puppeteer installation
- Verify font availability
- Check server memory limits

**Chinese Text Not Rendering**
- Verify Noto Sans TC font loading
- Check CSS font fallbacks
- Test character encoding

**Export Modal Not Opening**
- Check component imports
- Verify session data format
- Check console for errors

**Batch Export Timeout**
- Reduce batch size
- Check server timeout settings
- Monitor memory usage

## 📈 Performance Metrics

### Typical Export Times
- **TXT**: < 1 second
- **PDF**: 2-5 seconds (client), 1-2 seconds (server)
- **DOCX**: 1-3 seconds
- **JSON**: < 1 second
- **Batch (10 files)**: 5-15 seconds

### File Sizes
- **TXT**: 50-200KB per hour of audio
- **PDF**: 200KB-2MB depending on layout
- **DOCX**: 100-500KB
- **JSON**: 100-300KB with metadata

## 🤝 Contributing

### Development Setup
1. Clone repository
2. Install dependencies: `npm install`
3. Start development server: `npm run dev`
4. Start backend: `cd lecture-transcription-backend && npm start`

### Testing
1. Run component tests: `npm test`
2. Test export formats with sample data
3. Verify mobile responsiveness
4. Test Traditional Chinese rendering

## 📞 Support

For issues related to:
- **Export functionality**: Check console errors and network requests
- **PDF generation**: Verify server setup and Puppeteer installation
- **Chinese fonts**: Test system font availability
- **Mobile issues**: Check responsive design and touch interactions

## 📄 License

Part of Lecture Transcription PWA - designed for Hong Kong university students.

---

*🚀 Built with React, TypeScript, and Tailwind CSS for Hong Kong universities*