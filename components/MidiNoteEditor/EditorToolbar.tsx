'use client';

import React, { useEffect, useState } from 'react';
import { MidiPlayer } from '@/lib/MidiPlayer';
import { useStore } from '@/hooks/useStore';
import {
  Play,
  Pause,
  Undo,
  Redo,
  Minimize,
  Maximize,
  RefreshCcw,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ResolutionSelector } from './ResolutionSelector';
import { CameraMode, CameraModes } from '@/lib/rhythmBall/Camera';
import { useRhythmInstance } from '@/hooks/useRhythmInstance';


interface EditorToolbarProps {
  currentTime: number;
  totalDuration: number;
  resolution: '16:9' | '9:16';
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  currentTime,
  totalDuration,
}) => {
  const { undo, redo, canUndo, canRedo } = useStore<SerializedNote[]>('notes');
  const [isPlaying, setIsPlaying] = useState(false);
  const { value: cameraMode, setValue: setCameraMode } = useStore<CameraMode>('cameraMode', CameraModes.ALL);
  const { refresh, loading } = useRhythmInstance();

  const toggleCameraMode = () => {
    setCameraMode(cameraMode === CameraModes.ALL ? CameraModes.FOLLOW : CameraModes.ALL);
  };

  useEffect(() => {
    const handleToggle = (val: boolean) => setIsPlaying(val);
    MidiPlayer.get().on('toggle', handleToggle);
    return () => MidiPlayer.get().off('toggle', handleToggle);
  }, []);

  const handlePlayToggle = async () => {
    await MidiPlayer.get().toggle();
  };

  const formatTime = (t: number) => `${t.toFixed(2)}s`;

  return (
    <div className="h-10 flex items-center gap-2 px-3 border-b bg-gray-100 text-sm shrink-0 justify-center">
      <Button
        variant="ghost"
        size="icon"
        onClick={undo}
        disabled={!canUndo}
        title="撤销"
      >
        <Undo className="w-4 h-4" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={redo}
        disabled={!canRedo}
        title="重做"
      >
        <Redo className="w-4 h-4" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={handlePlayToggle}
        title={isPlaying ? '暂停' : '播放'}
      >
        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
      </Button>

      <span className="text-xs text-gray-500 ml-2">
        {formatTime(currentTime)} / {formatTime(totalDuration)}
      </span>

      <ResolutionSelector />

      <Button
        variant="ghost"
        size="icon"
        onClick={toggleCameraMode}
        title={cameraMode === CameraModes.ALL ? '全局视角' : '跟随视角'}
      >
        {cameraMode === CameraModes.ALL ? (
          <Minimize className="w-4 h-4" />
        ) : (
          <Maximize className="w-4 h-4" />
        )}
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={refresh}
        disabled={loading}
        title="刷新路径"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
      </Button>
    </div>
  );
};
