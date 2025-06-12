'use client';

import { useEffect, useRef, useState } from 'react';
import RightSidebar from '@/components/RightSidebar';
import { getOrReplaceBank } from '@/lib/createSynthBank';
import { createToneTransportPlayer } from '@/lib/createToneTransportPlayer';
import { createRhythmInstance, disposeRhythmInstance } from '@/lib/createRhythmInstance';
import { CanvasResizer } from '@/scripts/CanvasResizer';
import * as Tone from 'tone';
import { MidiNoteEditor } from '@/components/MidiNoteEditor/Eidtor';
import { MidiPlayer } from '@/lib/MidiPlayer';


export default function EditorPage() {
  const [notes, setNotes] = useState<SerializedNote[]>([]);
  const [editorHeight, setEditorHeight] = useState(240);

  const [speed, setSpeed] = useState(0.25);
  const [characterSize, setCharacterSize] = useState(30);
  const [resolution, setResolution] = useState<'16:9' | '9:16'>('9:16');
  const [cameraMode, setCameraMode] = useState<'fit' | 'pixel'>('fit');

  const rhythmRef = useRef<ReturnType<typeof createRhythmInstance> | null>(null);
  const synthRef = useRef<ReturnType<typeof getOrReplaceBank> | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playerRef = useRef<ReturnType<typeof createToneTransportPlayer> | null>(null);

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
    if (!notes || !notes.length || !canvasRef.current) {
      return;
    }
    disposeRhythmInstance();
    rhythmRef.current = createRhythmInstance({
      canvas: canvasRef.current,
      events: notes,
    });
    rhythmRef.current.refresh();
    rhythmRef.current.render();
  }, [notes]);

  // 重绘
  useEffect(() => {
    if (!rhythmRef.current) {
      return;
    }
    rhythmRef.current.options = {
      ...rhythmRef.current.options,
      speed,
      characterSize,
    };
  }, []);

  const handleMidiFileChange = (parsed: SerializedNote[]) => {
    setNotes(parsed);
  };

  const toggleCameraMode = () => {
    setCameraMode((prev) => {
      const mode = prev === 'fit' ? 'pixel' : 'fit';
      if (rhythmRef.current) {
        rhythmRef.current.camera.fitToPath(rhythmRef.current.walls.getPath());
        rhythmRef.current.camera.setMode(mode);
        rhythmRef.current.render();
      }
      return mode;
    });
  };

  useEffect(() => {
    return () => {
      Tone.Transport.stop();
      Tone.Transport.cancel();
      playerRef.current?.dispose();
      synthRef.current?.dispose();
    };
  }, []);

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
          onNotesChange={handleMidiFileChange}
          speed={speed}
          onSpeedChange={setSpeed}
          characterSize={characterSize}
          onCharacterSizeChange={setCharacterSize}
          resolution={resolution}
          onResolutionChange={setResolution}
          cameraMode={cameraMode}
          onCameraModeToggle={toggleCameraMode}
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
          onMouseDown={(e) => {
            e.preventDefault();
            const startY = e.clientY;
            const startHeight = editorHeight;

            const onMouseMove = (moveEvent: MouseEvent) => {
              const deltaY = moveEvent.clientY - startY;
              const newHeight = Math.min(Math.max(120, startHeight - deltaY), 600);
              setEditorHeight(newHeight);
            };

            const onMouseUp = () => {
              window.removeEventListener('mousemove', onMouseMove);
              window.removeEventListener('mouseup', onMouseUp);
            };

            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', onMouseUp);
          }}
        />

        {/* 内容区 */}
        <div className="h-full overflow-hidden pt-[6px]">
          <MidiNoteEditor
            notes={notes}
            onNotesChange={setNotes}
            onTimeChange={(t) => {
              rhythmRef.current?.setCurrentTime(t);
              MidiPlayer.pause();
              MidiPlayer.seek(t);
            }}
          />
        </div>
      </div>
    </div>
  );
}
