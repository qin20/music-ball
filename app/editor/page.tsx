'use client';

import { MouseEventHandler, useEffect, useRef, useState } from 'react';
import { CanvasResizer } from '@/lib/rhythmBall/CanvasResizer';
import { useStore } from '@/hooks/useStore';
import { MidiPlayer, MidiPlayerConfigEvents } from '@/lib/MidiPlayer';
import { MidiNoteEditor } from '@/components/MidiNoteEditor/MidiNoteEditor';
import { RightSidebar } from '@/components/RightSidebar';
import { Rhythm } from '@/lib/rhythmBall/Rhythm';
import { TextureManager } from '@/lib/rhythmBall/TextureManager';
import { compressNotes } from '@/lib/Midi';
import { ResolutionValue } from '@/components/MidiNoteEditor/ResolutionSelector';
import { CameraMode, CameraModes } from '@/lib/rhythmBall/Camera';
import { useRhythmInstance } from '@/hooks/useRhythmInstance';


/**
 * 根据音符最小时间间隔和最小期望位移距离，计算推荐速度
 * @param notes 音符数组（需已排序）
 * @param minDistance 最小运动距离（单位：px）
 * @returns 推荐速度（单位：px/ms）
 */
export function calculateRecommendedSpeedByDistance(
  notes: SerializedNote[],
  minDistance: number
): number {
  if (notes.length < 2) return 100;

  let minDelta = Infinity;
  for (let i = 1; i < notes.length; i++) {
    if (notes[i].disabled || notes[i - 1].disabled) continue;

    const delta = notes[i].time - notes[i - 1].time;
    if (delta > 0 && delta < minDelta) {
      minDelta = delta;
    }
  }

  console.log(minDelta, minDistance, minDelta > 0 ? minDistance / minDelta : 100);
  return minDelta > 0 ? minDistance / minDelta : 100;
}

export default function EditorPage() {
  const { value: notes, enableShortcuts, disableShortcuts } = useStore<SerializedNote[]>('notes', []);
  const { value: resolution } = useStore<ResolutionValue>('resolution', '9:16');
  const { value: cameraMode } = useStore<CameraMode>('cameraMode', CameraModes.ALL);

  const [editorHeight, setEditorHeight] = useState(240);
  const [speed, setSpeed] = useState(0.25);
  const [characterSize, setCharacterSize] = useState(30);

  const { get: getRhythm, refresh, set: setRhythm } = useRhythmInstance();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const resizerRef = useRef<CanvasResizer>(null);

  useEffect(() => {
    enableShortcuts();
    return () => disableShortcuts();
  }, [enableShortcuts, disableShortcuts]);

  useEffect(() => {
    const handleToggle: MidiPlayerConfigEvents['progress'] = (percent, current) => {
      getRhythm()?.seekTo(current);
    };
    MidiPlayer.get().on('progress', handleToggle);
    return () => MidiPlayer.get().off('progress', handleToggle);
  }, [getRhythm]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resizer = resizerRef.current;
    if (!resizer) {
      resizerRef.current = new CanvasResizer(canvas);
    }
    resizerRef.current?.enableAutoResize({
      mode: resolution === '9:16' ? [9, 16] : [16, 9],
      getContainerSize: () => ({
        width: canvas?.parentElement?.offsetWidth || 0,
        height: canvas?.parentElement?.offsetHeight || 0,
      }),
      onResize: (cw: number, ch: number) => {
        getRhythm()?.camera.setMargin(cw * 0.15, ch * 0.15);
        getRhythm()?.render();
      }
    });

    return () => resizerRef.current?.disableAutoResize();
  }, [resolution, getRhythm]);

  useEffect(() => {
    const run = async () => {
      const _compressNotes = compressNotes(notes, 0.05);
      if (!_compressNotes || !_compressNotes.length || !canvasRef.current) {
        return;
      }
      console.log(_compressNotes);
      const characterSize = 30;
      const rhythm = new Rhythm(canvasRef.current, _compressNotes, {
        background: '#fff',
        characterSize,
        characterSkin: null,
        pathWidth: characterSize,
        speed: calculateRecommendedSpeedByDistance(_compressNotes, characterSize * 0.75),
        // speed: 100,
        wallColor: '#222',
        wallLength: characterSize,
        wallThickness: characterSize / 4,
      });
      setRhythm(rhythm);
      await refresh();
      TextureManager.loadPattern('/assets/textures/bg.png').then((pattern) => {
        getRhythm()?.setBgPattern(pattern); // 动态切换
      });
    };

    run();
  }, [notes, getRhythm, refresh, setRhythm]);

  useEffect(() => {
    getRhythm()?.camera.setMode(cameraMode);
    getRhythm()?.render();
  }, [cameraMode, getRhythm]);

  const handleResize: MouseEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = editorHeight;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = moveEvent.clientY - startY;
      const newHeight = Math.min(Math.max(120, startHeight - deltaY), 600);
      setEditorHeight(newHeight);
      resizerRef.current?.resize();
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  return (
    <div className="flex flex-col h-screen">
      {/* 上半部分内容区域：画布 + Sidebar */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 bg-gray-50 relative">
          <div className="w-full h-full flex items-center justify-center bg-gray-50 relative">
            <canvas
              ref={canvasRef}
              className="bg-white shadow-2xl rounded-xl"
            />
          </div>
        </div>

        <RightSidebar
          speed={speed}
          onSpeedChange={setSpeed}
          characterSize={characterSize}
          onCharacterSizeChange={setCharacterSize}
        />
      </div>

      {/* MIDI 编辑器（带可拖动顶部） */}
      <div
        style={{ height: editorHeight }}
        className="relative bg-white border-t border-gray-300"
      >
        {/* 拖动条 */}
        <div
          className="absolute top-0 left-0 right-0 h-[6px] cursor-row-resize bg-gray-200 z-10"
          onMouseDown={handleResize}
        />

        {/* 内容区 */}
        <div className="h-full overflow-hidden pt-[6px]">
          <MidiNoteEditor
            onTimeChange={(t) => {
              getRhythm()?.seekTo(t);
              MidiPlayer.get().pause();
              MidiPlayer.get().seek(t);
            }}
          />
        </div>
      </div>
    </div>
  );
}
