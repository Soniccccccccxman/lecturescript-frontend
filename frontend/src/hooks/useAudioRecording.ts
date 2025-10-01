import { useState, useCallback, useRef, useEffect } from 'react';
import type { AudioRecordingState } from '../types';
import { AudioProcessor, createOptimizedMediaRecorder } from '../utils/audioProcessor';

export const useAudioRecording = () => {
  const [state, setState] = useState<AudioRecordingState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    stream: null,
    mediaRecorder: null,
    audioBlob: null,
    error: null,
  });

  const audioProcessor = useRef<AudioProcessor>(new AudioProcessor());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedDurationRef = useRef<number>(0);
  const audioChunks = useRef<Blob[]>([]);

  const updateDuration = useCallback(() => {
    if (state.isRecording && !state.isPaused) {
      const now = Date.now();
      const elapsed = Math.floor((now - startTimeRef.current - pausedDurationRef.current) / 1000);
      setState(prev => ({ ...prev, duration: elapsed }));
    }
  }, [state.isRecording, state.isPaused]);

  useEffect(() => {
    if (state.isRecording && !state.isPaused) {
      intervalRef.current = setInterval(updateDuration, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [state.isRecording, state.isPaused, updateDuration]);

  const requestMicrophonePermission = async (): Promise<MediaStream> => {
    try {
      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000, // Optimized for Whisper API
          channelCount: 1, // Mono
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      return stream;
    } catch (error) {
      console.error('Microphone permission denied:', error);
      throw new Error('Microphone access is required for recording. Please allow microphone permissions and try again.');
    }
  };

  const startRecording = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, error: null }));

      const stream = await requestMicrophonePermission();
      await audioProcessor.current.initialize(stream);

      audioChunks.current = [];
      startTimeRef.current = Date.now();
      pausedDurationRef.current = 0;

      const mediaRecorder = createOptimizedMediaRecorder(
        stream,
        (event) => {
          if (event.data.size > 0) {
            audioChunks.current.push(event.data);
          }
        },
        () => {
          const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
          setState(prev => ({
            ...prev,
            audioBlob,
            isRecording: false,
            isPaused: false,
          }));
        }
      );

      // Start recording with 1-second chunks for real-time processing
      mediaRecorder.start(1000);

      setState(prev => ({
        ...prev,
        isRecording: true,
        isPaused: false,
        stream,
        mediaRecorder,
        duration: 0,
      }));
    } catch (error) {
      console.error('Failed to start recording:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to start recording',
      }));
    }
  }, []);

  const pauseRecording = useCallback(() => {
    if (state.mediaRecorder && state.isRecording && !state.isPaused) {
      state.mediaRecorder.pause();
      pausedDurationRef.current += Date.now() - startTimeRef.current;
      setState(prev => ({ ...prev, isPaused: true }));
    }
  }, [state.mediaRecorder, state.isRecording, state.isPaused]);

  const resumeRecording = useCallback(() => {
    if (state.mediaRecorder && state.isRecording && state.isPaused) {
      state.mediaRecorder.resume();
      startTimeRef.current = Date.now();
      setState(prev => ({ ...prev, isPaused: false }));
    }
  }, [state.mediaRecorder, state.isRecording, state.isPaused]);

  const stopRecording = useCallback(() => {
    if (state.mediaRecorder && state.isRecording) {
      state.mediaRecorder.stop();

      // Stop all tracks to release microphone
      if (state.stream) {
        state.stream.getTracks().forEach(track => track.stop());
      }

      // Cleanup audio processor
      audioProcessor.current.cleanup();

      setState(prev => ({
        ...prev,
        stream: null,
        mediaRecorder: null,
      }));
    }
  }, [state.mediaRecorder, state.isRecording, state.stream]);

  const resetRecording = useCallback(() => {
    if (state.isRecording) {
      stopRecording();
    }

    audioChunks.current = [];
    startTimeRef.current = 0;
    pausedDurationRef.current = 0;

    setState({
      isRecording: false,
      isPaused: false,
      duration: 0,
      stream: null,
      mediaRecorder: null,
      audioBlob: null,
      error: null,
    });
  }, [state.isRecording, stopRecording]);

  const getAudioLevel = useCallback((): number => {
    if (!state.isRecording || state.isPaused) return 0;
    return audioProcessor.current.getAudioLevel();
  }, [state.isRecording, state.isPaused]);

  const getWaveformData = useCallback((): number[] => {
    if (!state.isRecording || state.isPaused) return [];
    return audioProcessor.current.getWaveformData();
  }, [state.isRecording, state.isPaused]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (state.stream) {
        state.stream.getTracks().forEach(track => track.stop());
      }
      audioProcessor.current.cleanup();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    ...state,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    resetRecording,
    getAudioLevel,
    getWaveformData,
  };
};