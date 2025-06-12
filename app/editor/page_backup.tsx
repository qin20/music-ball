'use client';

import { useEffect, useRef, useState } from 'react';
import TopToolbar from '@/components/TopToolbar';
import RightSidebar from '@/components/RightSidebar';
import NotesSidebar from '@/components/NotesSidebar';
import { getOrReplaceBank } from '@/lib/createSynthBank';
import { createToneTransportPlayer } from '@/lib/createToneTransportPlayer';
import { createRhythmInstance, disposeRhythmInstance } from '@/lib/createRhythmInstance';
import { CanvasResizer } from '@/scripts/CanvasResizer';
import * as Tone from 'tone';


export default function EditorPage() {
  const [originalEvents, setOriginalEvents] = useState<MidiNote[]>([]);
  const [events, setEvents] = useState<MidiNote[]>([]);
  const [disabledIndexes, setDisabledIndexes] = useState<Set<number>>(new Set());

  const [speed, setSpeed] = useState(0.25);
  const [theme, setTheme] = useState('default');
  const [characterSize, setCharacterSize] = useState(30);
  const [resolution, setResolution] = useState<'16:9' | '9:16'>('9:16');
  const [cameraMode, setCameraMode] = useState<'fit' | 'pixel'>('fit');

  const [synthType, setSynthType] = useState<SynthType>('metal');
  const [volume, setVolume] = useState(0);
  const [transpose, setTranspose] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [startOffset, setStartOffset] = useState(0); // 支持暂停续播

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
    if (!events || !events.length || !canvasRef.current) {
      return;
    }
    disposeRhythmInstance();
    rhythmRef.current = createRhythmInstance({
      canvas: canvasRef.current,
      events,
    });
    setIsPlaying(false);
    setStartOffset(0);
    rhythmRef.current.refresh();
    rhythmRef.current.render();
  }, [events]);

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

  useEffect(() => {
    if (!isPlaying) return;
    let rafId: number;

    const tick = () => {
      const ms = Tone.Transport.seconds * 1000;
      rhythmRef.current?.setCurrentTime(ms);
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying]);

  const handleStartPlayback = async () => {
    await Tone.start();

    const bank = getOrReplaceBank(synthRef, synthType, { volume, transpose });

    if (playerRef.current) {
      playerRef.current.dispose();
    }

    const player = createToneTransportPlayer({
      events,
      synth: bank.mainSynth,
      transpose,
    });

    player.start(startOffset);
    playerRef.current = player;

    setIsPlaying(true);
  };

  const handleStopPlayback = () => {
    const ms = Tone.Transport.seconds * 1000;
    setStartOffset(ms);
    playerRef.current?.pause();
    setIsPlaying(false);
  };

  const handleMidiFileChange = (parsed: MidiNote[]) => {
    console.log(parsed);
    setOriginalEvents(parsed);
    setEvents(parsed);
    setDisabledIndexes(new Set());
    setStartOffset(0);
  };

  const handleToggleDisable = (index: number, disable: boolean) => {
    setDisabledIndexes(prev => {
      const newSet = new Set(prev);
      if (disable) newSet.add(index);
      else newSet.delete(index);
      const active = originalEvents.filter((_, i) => !newSet.has(i));
      setEvents(active);
      return newSet;
    });
  };

  const handleSeek = (time: number) => {
    rhythmRef.current?.setCurrentTime(time);
    setStartOffset(time);
    Tone.Transport.seconds = time / 1000;
  };

  const handlePreview = async (index: number) => {
    const e = originalEvents[index];
    if (!e) return;
    await Tone.start();
    const bank = getOrReplaceBank(synthRef, synthType, { volume, transpose });
    const note = Tone.Frequency(e.midi + transpose, 'midi').toNote();
    bank.mainSynth.triggerAttackRelease(note, e.duration / 1000);
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

  const handleExport = () => console.log('导出中...');
  const handleReset = () => window.location.reload();

  useEffect(() => {
    if (!synthRef.current) return;
    synthRef.current.setVolume(volume);
    synthRef.current.setTranspose(transpose);
  }, [volume, transpose]);

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
      <TopToolbar onExport={handleExport} onReset={handleReset} />

      <div className="flex flex-1 overflow-hidden">
        <NotesSidebar
          events={originalEvents}
          disabledIndexes={disabledIndexes}
          onToggleDisable={handleToggleDisable}
          onSeek={handleSeek}
          onPreview={handlePreview}
        />

        <div className="flex-1 bg-gray-50 relative">
          <div className="w-full h-full flex items-center justify-center bg-gray-50 relative">
            <canvas
              ref={canvasRef}
              className="bg-white shadow-2xl rounded-xl"
            />
          </div>
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
            {!isPlaying ? (
              <button onClick={handleStartPlayback} className="px-4 py-2 bg-green-500 text-white rounded shadow">播放</button>
            ) : (
              <button onClick={handleStopPlayback} className="px-4 py-2 bg-yellow-500 text-white rounded shadow">暂停</button>
            )}
          </div>
        </div>

        <RightSidebar
          onMidiFileChange={handleMidiFileChange}
          speed={speed}
          onSpeedChange={setSpeed}
          theme={theme}
          onThemeChange={setTheme}
          characterSize={characterSize}
          onCharacterSizeChange={setCharacterSize}
          resolution={resolution}
          onResolutionChange={setResolution}
          cameraMode={cameraMode}
          onCameraModeToggle={toggleCameraMode}
          synthType={synthType}
          onSynthTypeChange={setSynthType}
          volume={volume}
          onVolumeChange={setVolume}
          transpose={transpose}
          onTransposeChange={setTranspose}
        />
      </div>
    </div>
  );
}
