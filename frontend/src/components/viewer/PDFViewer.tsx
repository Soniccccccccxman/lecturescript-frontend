// 🎯 LectureScript MVP - PDF Viewer Component
// Renders PDF using PDF.js with navigation controls
// Author: Peter Levler

import React, { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface PDFViewerProps {
  pdfUrl: string;
  currentPage?: number;
  onPageChange?: (page: number) => void;
}

export const PDFViewer: React.FC<PDFViewerProps> = ({
  pdfUrl,
  currentPage = 1,
  onPageChange,
}) => {
  const [pdf, setPdf] = useState<any>(null);
  const [pageNum, setPageNum] = useState(currentPage);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.5);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showKeyboardHint, setShowKeyboardHint] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  /**
   * Load PDF document
   */
  useEffect(() => {
    const loadPDF = async () => {
      try {
        setIsLoading(true);
        setError(null);

        console.log('📄 Loading PDF:', pdfUrl);

        const loadingTask = pdfjsLib.getDocument(pdfUrl);
        const pdfDoc = await loadingTask.promise;

        setPdf(pdfDoc);
        setNumPages(pdfDoc.numPages);
        setIsLoading(false);

        console.log('✅ PDF loaded:', pdfDoc.numPages, 'pages');
      } catch (err) {
        console.error('❌ PDF loading error:', err);
        setError('Failed to load PDF');
        setIsLoading(false);
      }
    };

    if (pdfUrl) {
      loadPDF();
    }
  }, [pdfUrl]);

  /**
   * Render current page
   */
  useEffect(() => {
    const renderPage = async () => {
      if (!pdf || !canvasRef.current) return;

      try {
        const page = await pdf.getPage(pageNum);
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        if (!context) return;

        const viewport = page.getViewport({ scale });

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        await page.render(renderContext).promise;

        console.log('✅ Page rendered:', pageNum);
      } catch (err) {
        console.error('❌ Page rendering error:', err);
      }
    };

    renderPage();
  }, [pdf, pageNum, scale]);

  /**
   * Navigate to page
   */
  const goToPage = (page: number) => {
    if (page >= 1 && page <= numPages) {
      setPageNum(page);
      if (onPageChange) {
        onPageChange(page);
      }
      // Hide keyboard hint after first use
      if (showKeyboardHint) {
        setTimeout(() => setShowKeyboardHint(false), 2000);
      }
    }
  };

  /**
   * 🎯 Keyboard Shortcuts - Apple Style
   * ← → : Previous/Next Page
   * Space/Shift+Space : Page Down/Up
   * Cmd+↑/↓ : First/Last Page
   */
  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      // Prevent if user is typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          goToPage(pageNum - 1);
          break;
        case 'ArrowRight':
          e.preventDefault();
          goToPage(pageNum + 1);
          break;
        case ' ':
          e.preventDefault();
          if (e.shiftKey) {
            goToPage(pageNum - 1); // Shift+Space = Previous
          } else {
            goToPage(pageNum + 1); // Space = Next
          }
          break;
        case 'ArrowUp':
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault();
            goToPage(1); // Cmd+↑ = First page
          }
          break;
        case 'ArrowDown':
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault();
            goToPage(numPages); // Cmd+↓ = Last page
          }
          break;
        case 'Home':
          e.preventDefault();
          goToPage(1);
          break;
        case 'End':
          e.preventDefault();
          goToPage(numPages);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, [pageNum, numPages]);

  /**
   * Zoom controls
   */
  const zoomIn = () => setScale(prev => Math.min(prev + 0.25, 3));
  const zoomOut = () => setScale(prev => Math.max(prev - 0.25, 0.5));
  const resetZoom = () => setScale(1.5);

  /**
   * Auto-fit to container width
   */
  const fitToWidth = () => {
    if (containerRef.current && pdf) {
      const containerWidth = containerRef.current.clientWidth - 48; // padding
      pdf.getPage(pageNum).then((page: any) => {
        const viewport = page.getViewport({ scale: 1 });
        const scaleToFit = containerWidth / viewport.width;
        setScale(scaleToFit);
      });
    }
  };

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            border: '4px solid #e5e7eb',
            borderTopColor: '#3b82f6',
            animation: 'spin 1s linear infinite',
          }}
        />
        <div style={{ fontSize: '14px', color: '#6b7280' }}>
          Loading PDF...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          flexDirection: 'column',
          gap: '12px',
          padding: '24px',
        }}
      >
        <span style={{ fontSize: '48px' }}>📄</span>
        <div style={{ fontSize: '16px', fontWeight: '500', color: '#ef4444' }}>
          {error}
        </div>
        <div style={{ fontSize: '14px', color: '#6b7280', textAlign: 'center' }}>
          Unable to load the PDF file. Please check the file URL.
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#525252',
      }}
    >
      {/* Controls */}
      <div
        style={{
          backgroundColor: '#374151',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          borderBottom: '1px solid #4b5563',
        }}
      >
        {/* Page Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => goToPage(pageNum - 1)}
            disabled={pageNum <= 1}
            style={{
              padding: '6px 12px',
              fontSize: '14px',
              color: 'white',
              backgroundColor: pageNum <= 1 ? '#4b5563' : '#6b7280',
              border: 'none',
              borderRadius: '6px',
              cursor: pageNum <= 1 ? 'not-allowed' : 'pointer',
              opacity: pageNum <= 1 ? 0.5 : 1,
            }}
          >
            ←
          </button>

          <span
            style={{
              fontSize: '14px',
              color: 'white',
              minWidth: '80px',
              textAlign: 'center',
            }}
          >
            {pageNum} / {numPages}
          </span>

          <button
            onClick={() => goToPage(pageNum + 1)}
            disabled={pageNum >= numPages}
            style={{
              padding: '6px 12px',
              fontSize: '14px',
              color: 'white',
              backgroundColor: pageNum >= numPages ? '#4b5563' : '#6b7280',
              border: 'none',
              borderRadius: '6px',
              cursor: pageNum >= numPages ? 'not-allowed' : 'pointer',
              opacity: pageNum >= numPages ? 0.5 : 1,
            }}
          >
            →
          </button>
        </div>

        {/* Zoom Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={zoomOut}
            style={{
              padding: '6px 12px',
              fontSize: '14px',
              color: 'white',
              backgroundColor: '#6b7280',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
            title="Zoom Out"
          >
            −
          </button>

          <button
            onClick={resetZoom}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              color: 'white',
              backgroundColor: '#6b7280',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
            title="Reset Zoom"
          >
            {Math.round(scale * 100)}%
          </button>

          <button
            onClick={zoomIn}
            style={{
              padding: '6px 12px',
              fontSize: '14px',
              color: 'white',
              backgroundColor: '#6b7280',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
            title="Zoom In"
          >
            +
          </button>

          <button
            onClick={fitToWidth}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              color: 'white',
              backgroundColor: '#6b7280',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
            title="Fit to Width"
          >
            Fit
          </button>
        </div>
      </div>

      {/* PDF Canvas */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '24px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
            backgroundColor: 'white',
          }}
        />
      </div>

      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default PDFViewer;