'use client';

import { useEffect, useRef, useState } from 'react';
import { Rhythm } from '@/scripts/Rhythm';
import { CanvasResizer } from '@/scripts/CanvasResizer';

interface RhythmEvent {
  time: number;
  delta: number;
  midi: number;
  pitch: string;
  solfege: string;
  duration: number;
  velocity: number;
}

interface CanvasPreviewProps {
  resolution: '16:9' | '9:16';
  events: RhythmEvent[] | null;
  audioUrl: string | null;
  speed?: number;
  theme?: string;
  characterSize?: number;
  characterSkin?: unknown;
  debug?: boolean;
  onProgress?: (time: number, noteIndex: number) => void;
}

export default function CanvasPreview({
  resolution,
  events,
  audioUrl,
  speed = 0.25,
  theme = 'default',
  characterSize = 40,
  characterSkin = null,
  debug = false,
  onProgress
}: CanvasPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const simulatorRef = useRef<Rhythm | null>(null);
  const rafRef = useRef<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!events || events.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizer = new CanvasResizer(canvas);
    resizer.enableAutoResize({
      mode: resolution === '9:16' ? [9, 16] : [16, 9],
      getContainerSize: () => ({
        width: window.innerWidth,
        height: window.innerHeight - 100,
      }),
    });

    const rhythm = new Rhythm(canvas, events, {
      speed,
      theme,
      characterSize,
      characterSkin,
      debug,
      ballStyle(
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        r: number
      ) {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = '#000';
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 12;
        ctx.fill();
      },
      drawTrail(
        ctx: CanvasRenderingContext2D,
        p: { x: number; y: number; life: number },
        radius: number
      ) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${p.life})`;
        ctx.fill();
      },
      wallColor: '#333',
      glowColor: '#fff',
      background: '#fff'
    });

    simulatorRef.current = rhythm;
    return () => cancelAnimationFrame(rafRef.current);
  }, [events, resolution, speed, theme, characterSize, characterSkin, debug]);

  const play = () => {
    if (!audioUrl || !audioRef.current || !simulatorRef.current) return;
    audioRef.current.currentTime = 0;
    audioRef.current.play();
    setIsPlaying(true);
    tick();
  };

  const pause = () => {
    audioRef.current?.pause();
    cancelAnimationFrame(rafRef.current);
    setIsPlaying(false);
  };

  const tick = () => {
    if (!isPlaying || !simulatorRef.current || !audioRef.current) return;

    const elapsed = audioRef.current.currentTime * 1000;
    const noteIndex = events!.findIndex(e => e.time > elapsed);
    const currentIndex = noteIndex <= 0 ? 0 : noteIndex - 1;

    if (onProgress) onProgress(elapsed, currentIndex);
    simulatorRef.current.setCurrentTime(elapsed);
    rafRef.current = requestAnimationFrame(tick);
  };

  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-50 relative">
      <canvas
        ref={canvasRef}
        className="bg-white shadow-2xl rounded-xl"
      />
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          preload="auto"
          crossOrigin="anonymous"
          hidden
        />
      )}
      <div className="absolute top-4 left-4 z-10">
        {!isPlaying ? (
          <button onClick={play} className="px-4 py-2 bg-green-500 text-white rounded">播放</button>
        ) : (
          <button onClick={pause} className="px-4 py-2 bg-yellow-500 text-white rounded">暂停</button>
        )}
      </div>
    </div>
  );
}
