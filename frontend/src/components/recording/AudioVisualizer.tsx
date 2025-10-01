import React, { useEffect, useRef } from 'react';
import { cn } from '../../utils/cn';

interface AudioVisualizerProps {
  audioLevel: number;
  waveformData: number[];
  isActive: boolean;
  className?: string;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  audioLevel,
  waveformData,
  isActive,
  className
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);

      if (!isActive) {
        // Draw inactive state
        ctx.fillStyle = '#e5e7eb';
        ctx.fillRect(width / 2 - 1, height / 2 - 10, 2, 20);
        return;
      }

      // Draw waveform
      if (waveformData.length > 0) {
        const barWidth = width / waveformData.length;
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, '#3b82f6');
        gradient.addColorStop(0.5, '#60a5fa');
        gradient.addColorStop(1, '#93c5fd');

        ctx.fillStyle = gradient;

        waveformData.forEach((value, index) => {
          const barHeight = Math.abs(value) * height * 0.8;
          const x = index * barWidth;
          const y = (height - barHeight) / 2;

          ctx.fillRect(x, y, barWidth - 1, barHeight);
        });
      } else {
        // Draw audio level bars
        const barCount = 20;
        const barWidth = (width - (barCount - 1) * 2) / barCount;
        const maxBarHeight = height * 0.8;

        for (let i = 0; i < barCount; i++) {
          const intensity = Math.max(0, audioLevel - (i / barCount) * 0.5);
          const barHeight = intensity * maxBarHeight;
          const x = i * (barWidth + 2);
          const y = (height - barHeight) / 2;

          // Color based on intensity
          let color = '#e5e7eb';
          if (intensity > 0.7) {
            color = '#ef4444'; // Red for high levels
          } else if (intensity > 0.4) {
            color = '#f59e0b'; // Orange for medium levels
          } else if (intensity > 0.1) {
            color = '#22c55e'; // Green for low levels
          }

          ctx.fillStyle = color;
          ctx.fillRect(x, y, barWidth, barHeight);
        }
      }

      animationFrameRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [audioLevel, waveformData, isActive]);

  // Set canvas size based on container
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  return (
    <div className={cn('relative bg-gray-50 rounded-lg overflow-hidden', className)}>
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ width: '100%', height: '100%' }}
      />

      {/* Overlay for additional visual feedback */}
      <div className={cn(
        'absolute inset-0 pointer-events-none transition-opacity duration-300',
        isActive ? 'opacity-20' : 'opacity-0'
      )}>
        <div className={cn(
          'w-full h-full bg-gradient-to-r from-primary-500 to-primary-600 opacity-10',
          audioLevel > 0.8 && 'animate-pulse'
        )} />
      </div>

      {/* Status indicator */}
      <div className="absolute top-2 right-2">
        <div className={cn(
          'w-3 h-3 rounded-full transition-all duration-300',
          isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-300'
        )} />
      </div>
    </div>
  );
};