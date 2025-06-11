'use client';

import { useEffect, useImperativeHandle, useRef, forwardRef } from 'react';
import { Rhythm } from '@/scripts/Rhythm';
import { CanvasResizer } from '@/scripts/CanvasResizer';

interface CanvasPreviewProps {
  resolution: '16:9' | '9:16';
  events: MidiNote[];
  speed?: number;
  theme?: string;
  characterSize?: number;
  characterSkin?: unknown;
  debug?: boolean;
  cameraMode?: 'fit' | 'pixel';
  onNoteHit?: (index: number) => void;
}

export default forwardRef(function CanvasPreview(
  {
    resolution,
    events,
    speed = 0.25,
    theme = 'default',
    characterSize = 40,
    characterSkin = null,
    debug = false,
    cameraMode = 'fit',
    onNoteHit,
  }: CanvasPreviewProps,
  ref
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rhythmRef = useRef<Rhythm | null>(null);

  useEffect(() => {
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

    return () => resizer.disableAutoResize();
  }, [resolution]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !events || events.length === 0) return;

    console.log('重绘');

    const rhythm = new Rhythm(canvas, events, {
      speed,
      theme,
      characterSize,
      characterSkin,
      cameraMode,
      debug,

      ballStyle: (
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        r: number
      ) => {
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = '#000';
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 12;
        ctx.fill();
        ctx.restore();
      },

      drawTrail: (
        ctx: CanvasRenderingContext2D,
        p: { x: number; y: number; life: number },
        radius: number
      ) => {
        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${p.life})`;
        ctx.fill();
        ctx.restore();
      },

      wallColor: '#333',
      glowColor: '#fff',
      background: '#fff',
    });

    // ✅ 撞击时触发回调
    rhythm.walls.on('hit', (_seg, _wall, i) => {
      onNoteHit?.(i);
    });

    rhythmRef.current = rhythm;

    return () => {
      rhythmRef.current = null;
    };
  }, [events, speed, theme, characterSize, characterSkin, cameraMode, debug, onNoteHit]);

  useImperativeHandle(ref, () => ({
    seekTo: (time: number) => {
      rhythmRef.current?.setCurrentTime(time);
    },
  }));

  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-50 relative">
      <canvas
        ref={canvasRef}
        className="bg-white shadow-2xl rounded-xl"
      />
    </div>
  );
});
