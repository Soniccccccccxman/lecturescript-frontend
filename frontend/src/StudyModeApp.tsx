// 🎯 LectureScript MVP - Study Mode Application
// Main application orchestrating upload, split-screen viewer, and export
// Author: Peter Levler

import React, { useState } from 'react';
import { FileUploadZone } from './components/upload/FileUploadZone';
import { SplitScreenViewer } from './components/viewer/SplitScreenViewer';
import { ThemeToggle } from './components/ui/ThemeToggle';
import type { AudioFile, PDFFile } from './types/upload';
import type { TranscriptionSegment } from './types/transcription';

type AppState = 'upload' | 'processing' | 'viewer';

export const StudyModeApp: React.FC = () => {
  const [appState, setAppState] = useState<AppState>('upload');
  const [audioFile, setAudioFile] = useState<AudioFile | null>(null);
  const [pdfFile, setPDFFile] = useState<PDFFile | null>(null);
  const [transcription, setTranscription] = useState<TranscriptionSegment[]>([]);
  const [isPolling, setIsPolling] = useState(false);

  /**
   * Handle upload completion - start polling for transcription
   */
  const handleUploadComplete = async (audio: AudioFile, pdf: PDFFile | null) => {
    console.log('✅ Files uploaded:', { audio, pdf });

    setAudioFile(audio);
    setPDFFile(pdf);
    setAppState('processing');

    // Start polling for transcription result using transcriptId from backend
    if (audio.transcriptId) {
      console.log(`🔍 Starting transcription poll for ID: ${audio.transcriptId}`);
      setIsPolling(true);
      await pollTranscription(audio.transcriptId);
    } else {
      console.error('❌ No transcriptId found in audio file:', audio);
      alert('Upload error: No transcript ID received. Please try again.');
      setAppState('upload');
    }
  };

  /**
   * Poll transcription API until completed
   */
  const pollTranscription = async (transcriptId: string) => {
    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    const maxAttempts = 120; // 10 minutes max (5s intervals)
    let attempts = 0;

    const poll = async () => {
      try {
        attempts++;

        const response = await fetch(`${API_BASE}/api/transcription/${transcriptId}`);
        const data = await response.json();

        console.log(`📊 Polling transcription (attempt ${attempts}/${maxAttempts}):`, data.status);

        if (data.status === 'completed' && data.transcription) {
          // Convert to our format
          const segments: TranscriptionSegment[] = data.transcription.segments?.map((seg: any, idx: number) => ({
            id: `seg-${idx}`,
            text: seg.text || '',
            start: seg.start || 0,
            end: seg.end || 0,
            speaker: 'Professor',
            words: seg.words || [],
          })) || [];

          setTranscription(segments);
          setIsPolling(false);
          setAppState('viewer');
          console.log('✅ Transcription completed:', segments.length, 'segments');
          return;
        }

        if (data.status === 'processing' && attempts < maxAttempts) {
          // Continue polling
          setTimeout(poll, 5000); // Poll every 5 seconds
        } else if (attempts >= maxAttempts) {
          console.error('❌ Transcription timeout');
          setIsPolling(false);
          alert('Transcription is taking too long. Please try again.');
          setAppState('upload');
        }

      } catch (error) {
        console.error('❌ Polling error:', error);

        if (attempts < maxAttempts) {
          setTimeout(poll, 5000);
        } else {
          setIsPolling(false);
          alert('Failed to get transcription. Please try again.');
          setAppState('upload');
        }
      }
    };

    poll();
  };

  /**
   * Handle back to upload
   */
  const handleBackToUpload = () => {
    setAppState('upload');
    setAudioFile(null);
    setPDFFile(null);
    setTranscription([]);
    setIsPolling(false);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--bg-secondary)',
        fontFamily: 'var(--font-primary)',
      }}
    >
      {/* 🎨 Apple-Style Minimalist Header with Glass Morphism */}
      <header
        className="glass elevation-2"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'var(--blur-md)',
          borderBottom: '1px solid var(--color-gray-200)',
          padding: 'var(--space-md) var(--space-xl)',
          position: 'sticky',
          top: 0,
          zIndex: 1000,
        }}
      >
        <div
          style={{
            maxWidth: '1440px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Logo & Brand - Minimalist */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
            <span
              style={{
                fontSize: 'var(--text-lg)',
                filter: 'grayscale(10%)',
                transition: 'var(--transition-base)',
              }}
            >
              📚
            </span>
            <h1
              style={{
                fontSize: 'var(--text-md)',
                fontWeight: 'var(--font-semibold)',
                color: 'var(--text-primary)',
                margin: 0,
                letterSpacing: '-0.02em',
              }}
            >
              LectureScript
            </h1>
          </div>

          {/* Right Side: Theme Toggle + Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-lg)' }}>
            {/* 🌓 Theme Toggle */}
            <ThemeToggle />

            {/* New Upload Button - Apple Blue */}
            {appState === 'viewer' && (
              <button
                onClick={handleBackToUpload}
                className="focus-ring transition-spring"
                style={{
                  padding: 'var(--space-sm) var(--space-lg)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 'var(--font-medium)',
                  color: 'var(--color-primary)',
                  backgroundColor: 'rgba(0, 122, 255, 0.08)',
                  border: 'none',
                  borderRadius: 'var(--radius-lg)',
                  cursor: 'pointer',
                  transition: 'var(--transition-base)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-sm)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(0, 122, 255, 0.15)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(0, 122, 255, 0.08)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                ← New Upload
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>
        {appState === 'upload' && (
          <FileUploadZone onUploadComplete={handleUploadComplete} />
        )}

        {appState === 'processing' && (
          <div
            style={{
              maxWidth: '600px',
              margin: '80px auto',
              padding: '48px 24px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontSize: '64px',
                marginBottom: '24px',
                animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
              }}
            >
              🎯
            </div>
            <h2
              style={{
                fontSize: '28px',
                fontWeight: '700',
                color: '#1f2937',
                marginBottom: '12px',
              }}
            >
              Processing Your Lecture
            </h2>
            <p
              style={{
                fontSize: '16px',
                color: '#6b7280',
                marginBottom: '32px',
                lineHeight: '1.6',
              }}
            >
              We're transcribing your audio using AI. This may take a few minutes depending on the length of your recording.
            </p>

            {/* Processing Steps */}
            <div
              style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '24px',
                textAlign: 'left',
                border: '1px solid #e5e7eb',
              }}
            >
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: '#10b981',
                      color: 'white',
                      fontSize: '12px',
                      fontWeight: 'bold',
                    }}
                  >
                    ✓
                  </span>
                  <span style={{ fontSize: '14px', color: '#1f2937' }}>
                    Files uploaded successfully
                  </span>
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      border: '3px solid #3b82f6',
                      borderTopColor: 'transparent',
                      animation: 'spin 1s linear infinite',
                    }}
                  />
                  <span style={{ fontSize: '14px', color: '#1f2937', fontWeight: '500' }}>
                    Transcribing audio with AI...
                  </span>
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: '#e5e7eb',
                      color: '#9ca3af',
                      fontSize: '12px',
                    }}
                  >
                    ○
                  </span>
                  <span style={{ fontSize: '14px', color: '#6b7280' }}>
                    Preparing study viewer
                  </span>
                </div>
              </div>
            </div>

            <p
              style={{
                fontSize: '12px',
                color: '#9ca3af',
                marginTop: '24px',
              }}
            >
              Please don't close this window. Processing time: ~1 minute per 10 minutes of audio.
            </p>
          </div>
        )}

        {appState === 'viewer' && transcription.length > 0 && (
          <SplitScreenViewer
            pdfUrl={pdfFile?.url}
            transcription={transcription}
            audioFile={audioFile}
          />
        )}
      </main>

      {/* CSS Animations */}
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }

          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}
      </style>
    </div>
  );
};

export default StudyModeApp;