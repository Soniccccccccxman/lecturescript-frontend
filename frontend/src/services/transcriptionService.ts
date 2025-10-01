// 🎯 LectureScript MVP - Transcription Service
// Handles transcription status polling with excellent UX
// Author: Peter Levler (as Steve Jobs would demand)

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export interface TranscriptionStatus {
  status: 'processing' | 'completed' | 'error';
  transcription?: {
    text: string;
    segments: any[];
    language: string;
    duration: number;
  };
  error?: string;
}

class TranscriptionService {
  /**
   * Poll for transcription status with user-friendly feedback
   */
  async pollTranscriptionStatus(
    transcriptId: string,
    onProgress?: (status: string, attempt: number, maxAttempts: number) => void
  ): Promise<TranscriptionStatus> {
    const maxAttempts = 120; // 10 minutes max (120 * 5s = 600s)
    const pollInterval = 5000; // 5 seconds

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        // Update progress callback
        if (onProgress) {
          const timeElapsed = Math.round((attempt * pollInterval) / 1000);
          const minutes = Math.floor(timeElapsed / 60);
          const seconds = timeElapsed % 60;
          const timeStr = minutes > 0
            ? `${minutes} 分 ${seconds} 秒`
            : `${seconds} 秒`;

          let statusMsg = '';
          if (timeElapsed < 30) {
            statusMsg = `⚡ 初始化 AI 轉錄引擎... (已等待 ${timeStr})`;
          } else if (timeElapsed < 120) {
            statusMsg = `🎵 AI 正在分析音訊內容... (已處理 ${timeStr})`;
          } else if (timeElapsed < 240) {
            statusMsg = `📝 生成逐字稿中... (已處理 ${timeStr})\n預計還需 1-2 分鐘`;
          } else {
            statusMsg = `⏰ 大型檔案處理中... (已處理 ${timeStr})\n即將完成`;
          }

          onProgress(statusMsg, attempt, maxAttempts);
        }

        // Check transcription status
        const response = await fetch(
          `${BACKEND_URL}/api/transcription/${transcriptId}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          if (response.status === 404) {
            // Transcription not found yet - keep polling
            console.log(`⏳ Transcription not ready yet (attempt ${attempt}/${maxAttempts})`);
          } else {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
        } else {
          const result = await response.json();

          if (result.status === 'completed') {
            console.log('✅ Transcription completed successfully!');
            return {
              status: 'completed',
              transcription: result.transcription,
            };
          }

          if (result.status === 'error') {
            return {
              status: 'error',
              error: result.error || 'Transcription failed',
            };
          }

          // Still processing - continue polling
          console.log(`🔄 Transcription in progress (attempt ${attempt}/${maxAttempts})...`);
        }

        // Wait before next poll
        if (attempt < maxAttempts) {
          await this.sleep(pollInterval);
        }
      } catch (error) {
        console.error(`❌ Polling error (attempt ${attempt}):`, error);

        // If it's the last attempt, throw
        if (attempt === maxAttempts) {
          return {
            status: 'error',
            error: error instanceof Error ? error.message : 'Failed to check transcription status',
          };
        }

        // Otherwise continue polling
        await this.sleep(pollInterval);
      }
    }

    // Timeout
    return {
      status: 'error',
      error: 'Transcription timeout. The process is taking longer than expected. Please try again or use a shorter audio file.',
    };
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cancel transcription (if needed in future)
   */
  cancelTranscription(transcriptId: string): void {
    console.log(`🛑 Cancelling transcription: ${transcriptId}`);
    // TODO: Implement backend endpoint for cancellation if needed
  }
}

// Export singleton instance
export const transcriptionService = new TranscriptionService();
export default transcriptionService;
