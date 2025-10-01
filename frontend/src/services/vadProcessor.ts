// 🍎 Steve Jobs 2025 Industrial-Grade VAD Audio Processor
// Based on industry research: WebRTC VAD + RMS silence detection

export interface VADConfig {
  silenceThreshold: number;      // RMS threshold (1% of max amplitude)
  silenceDuration: number;       // 3 seconds industry standard
  minChunkDuration: number;      // Minimum viable chunk
  maxChunkDuration: number;      // Prevent oversized chunks
  sampleRate: number;           // 16kHz standard
}

export interface AudioChunk {
  data: Blob;
  timestamp: number;
  duration: number;
  isSpeechDetected: boolean;
  rmsLevel: number;
}

// 🛡️ Global session management to prevent conflicts
class VADSessionManager {
  private static instance: VADSessionManager;
  private activeSession: string | null = null;
  private sessionStartTime: number = 0;

  static getInstance(): VADSessionManager {
    if (!VADSessionManager.instance) {
      VADSessionManager.instance = new VADSessionManager();
    }
    return VADSessionManager.instance;
  }

  startSession(sessionId: string): boolean {
    if (this.activeSession && this.activeSession !== sessionId) {
      console.warn(`🚫 VAD session conflict: ${sessionId} attempted to start while ${this.activeSession} is active`);
      return false;
    }

    this.activeSession = sessionId;
    this.sessionStartTime = Date.now();
    console.log(`✅ VAD session started: ${sessionId}`);
    return true;
  }

  endSession(sessionId: string): boolean {
    if (this.activeSession !== sessionId) {
      console.warn(`🚫 VAD session mismatch: ${sessionId} attempted to end but ${this.activeSession} is active`);
      return false;
    }

    const duration = Date.now() - this.sessionStartTime;
    console.log(`✅ VAD session ended: ${sessionId} (duration: ${Math.round(duration / 1000)}s)`);
    this.activeSession = null;
    this.sessionStartTime = 0;
    return true;
  }

  isSessionActive(sessionId: string): boolean {
    return this.activeSession === sessionId;
  }

  getActiveSession(): string | null {
    return this.activeSession;
  }
}

export class IntelligentVADProcessor {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;

  private config: VADConfig;
  private silenceStartTime: number = 0;
  private isInSilence: boolean = false;
  private chunkStartTime: number = 0;
  private sessionId: string;
  private sessionManager: VADSessionManager;

  // Industry-standard RMS buffer for real-time analysis
  private rmsBuffer: Float32Array = new Float32Array(1024);
  private animationFrameId: number = 0;

  constructor(config: Partial<VADConfig> = {}) {
    this.config = {
      silenceThreshold: 0.01,      // 1% threshold (industry standard)
      silenceDuration: 3000,       // 3 seconds (industry standard)
      minChunkDuration: 1000,      // 1 second minimum
      maxChunkDuration: 30000,     // 30 seconds maximum (Whisper window)
      sampleRate: 16000,           // 16kHz (optimal for Whisper)
      ...config
    };

    // Generate unique session ID
    this.sessionId = `vad_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    this.sessionManager = VADSessionManager.getInstance();
  }

  async initialize(): Promise<void> {
    console.log('🎯 Initializing Industrial-Grade VAD Processor...');

    // 🛡️ Check browser compatibility first
    if (!this.checkBrowserCompatibility()) {
      throw new Error('Your browser does not support required audio features. Please use Chrome, Firefox, or Safari.');
    }

    try {
      // Get high-quality audio stream with progressive fallback
      this.stream = await this.getAudioStreamWithFallback();

      // Setup Web Audio API for real-time analysis
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.8;

      const source = this.audioContext.createMediaStreamSource(this.stream);
      source.connect(this.analyser);

      // Setup MediaRecorder with optimized settings
      const mimeType = this.getBestMimeType();
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType,
        audioBitsPerSecond: 128000  // Optimal quality/size ratio
      });

      console.log(`✅ VAD Processor initialized with ${mimeType}`);

    } catch (error) {
      console.error('❌ VAD Processor initialization failed:', error);

      // 🎯 Enhanced user-friendly error messages
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          throw new Error('Microphone access denied. Please allow microphone permissions and try again.');
        } else if (error.name === 'NotFoundError') {
          throw new Error('No microphone found. Please connect a microphone and try again.');
        } else if (error.name === 'NotSupportedError') {
          throw new Error('Audio recording not supported in this browser. Please try Chrome or Firefox.');
        } else if (error.name === 'NotReadableError') {
          throw new Error('Microphone is being used by another application. Please close other apps and try again.');
        } else if (error.name === 'OverconstrainedError') {
          throw new Error('Microphone does not support required audio settings. Please try a different microphone.');
        }
      }

      throw new Error('Failed to initialize audio recording. Please check your microphone and try again.');
    }
  }

  private getBestMimeType(): string {
    const preferredTypes = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/wav'
    ];

    for (const type of preferredTypes) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    throw new Error('No supported audio MIME type found');
  }

  // 🛡️ Comprehensive browser compatibility check
  private checkBrowserCompatibility(): boolean {
    // Check essential APIs
    if (!navigator.mediaDevices?.getUserMedia) {
      console.error('❌ getUserMedia not supported');
      return false;
    }

    if (!window.MediaRecorder) {
      console.error('❌ MediaRecorder not supported');
      return false;
    }

    if (!(window.AudioContext || (window as any).webkitAudioContext)) {
      console.error('❌ Web Audio API not supported');
      return false;
    }

    if (!window.requestAnimationFrame) {
      console.error('❌ requestAnimationFrame not supported');
      return false;
    }

    // Check if any audio format is supported
    const supportedFormats = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/wav'
    ];

    const hasAudioSupport = supportedFormats.some(format =>
      MediaRecorder.isTypeSupported(format)
    );

    if (!hasAudioSupport) {
      console.error('❌ No supported audio formats');
      return false;
    }

    console.log('✅ Browser compatibility check passed');
    return true;
  }

  // 🔄 Progressive audio stream fallback
  private async getAudioStreamWithFallback(): Promise<MediaStream> {
    const constraints = [
      // Optimal configuration
      {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: this.config.sampleRate,
          channelCount: 1
        }
      },
      // Fallback without sample rate constraint
      {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1
        }
      },
      // Basic fallback
      {
        audio: {
          echoCancellation: true,
          noiseSuppression: true
        }
      },
      // Minimal fallback
      {
        audio: true
      }
    ];

    for (let i = 0; i < constraints.length; i++) {
      try {
        console.log(`🎯 Attempting audio stream config ${i + 1}/${constraints.length}`);
        const stream = await navigator.mediaDevices.getUserMedia(constraints[i]);
        console.log(`✅ Audio stream obtained with config ${i + 1}`);
        return stream;
      } catch (error) {
        console.warn(`⚠️ Audio config ${i + 1} failed:`, error);
        if (i === constraints.length - 1) {
          throw error; // Last attempt failed
        }
      }
    }

    throw new Error('All audio stream configurations failed');
  }

  // 🔥 Real-time RMS calculation (industry standard)
  private calculateRMS(): number {
    if (!this.analyser) return 0;

    this.analyser.getFloatTimeDomainData(this.rmsBuffer);

    let sum = 0;
    for (let i = 0; i < this.rmsBuffer.length; i++) {
      sum += this.rmsBuffer[i] * this.rmsBuffer[i];
    }

    return Math.sqrt(sum / this.rmsBuffer.length);
  }

  // 🎯 Intelligent speech detection algorithm
  private detectSpeech(): boolean {
    const rmsLevel = this.calculateRMS();
    const isSpeech = rmsLevel > this.config.silenceThreshold;

    const currentTime = Date.now();

    if (!isSpeech) {
      if (!this.isInSilence) {
        this.silenceStartTime = currentTime;
        this.isInSilence = true;
      }

      // Check if silence duration exceeded
      const silenceDuration = currentTime - this.silenceStartTime;
      return silenceDuration < this.config.silenceDuration;
    } else {
      this.isInSilence = false;
      return true;
    }
  }

  // 🚀 Smart chunking based on speech patterns
  private shouldCreateChunk(): boolean {
    const currentTime = Date.now();
    const chunkDuration = currentTime - this.chunkStartTime;

    // Force chunk if max duration reached
    if (chunkDuration >= this.config.maxChunkDuration) {
      return true;
    }

    // Create chunk on silence detection (if minimum duration met)
    if (this.isInSilence && chunkDuration >= this.config.minChunkDuration) {
      const silenceDuration = currentTime - this.silenceStartTime;
      return silenceDuration >= this.config.silenceDuration;
    }

    return false;
  }

  async startProcessing(onChunkReady: (chunk: AudioChunk) => void): Promise<void> {
    if (!this.mediaRecorder) {
      throw new Error('VAD Processor not initialized');
    }

    // 🛡️ Secure session start
    if (!this.sessionManager.startSession(this.sessionId)) {
      const activeSession = this.sessionManager.getActiveSession();
      throw new Error(`Cannot start VAD session - another session is active: ${activeSession}. Please stop the current session first.`);
    }

    console.log('🎬 Starting intelligent VAD processing...');

    let pendingData: Blob[] = [];

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        pendingData.push(event.data);
      }
    };

    // Real-time analysis loop
    const processAudio = () => {
      const isSpeechDetected = this.detectSpeech();
      const rmsLevel = this.calculateRMS();

      if (this.shouldCreateChunk() && pendingData.length > 0) {
        const chunkData = new Blob(pendingData, { type: this.mediaRecorder!.mimeType });
        const currentTime = Date.now();

        const chunk: AudioChunk = {
          data: chunkData,
          timestamp: currentTime,
          duration: currentTime - this.chunkStartTime,
          isSpeechDetected,
          rmsLevel
        };

        console.log(`🎵 Intelligent chunk created: ${chunkData.size} bytes, RMS: ${rmsLevel.toFixed(4)}, Speech: ${isSpeechDetected}`);

        onChunkReady(chunk);

        // Reset for next chunk
        pendingData = [];
        this.chunkStartTime = currentTime;
      }

      this.animationFrameId = requestAnimationFrame(processAudio);
    };

    // Start recording with small intervals for flexibility
    this.chunkStartTime = Date.now();
    this.mediaRecorder.start(100); // 100ms intervals for fine control

    // Start real-time analysis
    processAudio();
  }

  stop(): void {
    console.log('🛑 Stopping VAD processor...');

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }

    if (this.audioContext) {
      this.audioContext.close();
    }

    // 🛡️ End session securely
    this.sessionManager.endSession(this.sessionId);
  }

  // 🔍 Rapid start/stop protection
  private lastStopTime: number = 0;
  private rapidStopThreshold: number = 1000; // 1 second minimum between stop/start

  stopWithRapidProtection(): boolean {
    const now = Date.now();
    if (now - this.lastStopTime < this.rapidStopThreshold) {
      console.warn('⚠️ Rapid stop/start detected - please wait before restarting');
      return false;
    }

    this.stop();
    this.lastStopTime = now;
    return true;
  }

  // 🔊 Audio quality monitoring and adaptive handling
  private audioQualityMetrics = {
    consecutiveLowQuality: 0,
    lastQualityCheck: 0,
    averageRms: 0,
    rmsHistory: [] as number[]
  };

  private checkAudioQuality(): { quality: 'excellent' | 'good' | 'fair' | 'poor', shouldAlert: boolean } {
    const currentRms = this.calculateRMS();
    const now = Date.now();

    // Update RMS history (keep last 30 samples ~3 seconds at 100ms intervals)
    this.audioQualityMetrics.rmsHistory.push(currentRms);
    if (this.audioQualityMetrics.rmsHistory.length > 30) {
      this.audioQualityMetrics.rmsHistory.shift();
    }

    // Calculate average RMS
    const avgRms = this.audioQualityMetrics.rmsHistory.reduce((sum, rms) => sum + rms, 0) / this.audioQualityMetrics.rmsHistory.length;
    this.audioQualityMetrics.averageRms = avgRms;

    // Determine quality level
    let quality: 'excellent' | 'good' | 'fair' | 'poor';
    if (avgRms > 0.05) {
      quality = 'excellent';
      this.audioQualityMetrics.consecutiveLowQuality = 0;
    } else if (avgRms > 0.02) {
      quality = 'good';
      this.audioQualityMetrics.consecutiveLowQuality = 0;
    } else if (avgRms > 0.005) {
      quality = 'fair';
      this.audioQualityMetrics.consecutiveLowQuality = 0;
    } else {
      quality = 'poor';
      this.audioQualityMetrics.consecutiveLowQuality++;
    }

    // Check if we should alert (poor quality for 5+ consecutive checks)
    const shouldAlert = this.audioQualityMetrics.consecutiveLowQuality >= 5 &&
                       (now - this.audioQualityMetrics.lastQualityCheck > 10000); // Max once per 10 seconds

    if (shouldAlert) {
      this.audioQualityMetrics.lastQualityCheck = now;
      console.warn('⚠️ Poor audio quality detected - check microphone position and background noise');
    }

    return { quality, shouldAlert };
  }

  // 🎯 Enhanced metrics with quality monitoring
  getCurrentMetrics() {
    const qualityInfo = this.checkAudioQuality();

    return {
      rmsLevel: this.calculateRMS(),
      isInSilence: this.isInSilence,
      silenceDuration: this.isInSilence ? Date.now() - this.silenceStartTime : 0,
      config: this.config,
      audioQuality: qualityInfo.quality,
      averageRms: this.audioQualityMetrics.averageRms,
      qualityAlert: qualityInfo.shouldAlert
    };
  }
}

// Factory function for easy integration
export function createVADProcessor(config?: Partial<VADConfig>): IntelligentVADProcessor {
  return new IntelligentVADProcessor(config);
}