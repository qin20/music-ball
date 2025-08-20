'use client';

import React, { useEffect, useState } from 'react';
import { MidiPlayer } from '@/lib/MidiPlayer';
import {
  Play,
  Pause,
  Undo,
  Redo,
  Minimize,
  Maximize,
  RefreshCcw,
  Loader2,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ResolutionSelector } from './ResolutionSelector';
import { CameraModes } from '@/lib/rhythmBall/Camera';
import { useRhythmInstance } from '@/hooks/useRhythmInstance';
import { RhythmExporter } from '@/lib/rhythmBall/RhythmExporter';
import { downloadBlob } from '@/lib/rhythmBall/utils/downloadBlob';
import { QUALITY_MEDIUM } from 'mediabunny';
import { useAspectRatio, useCameraMode, useNotes } from '@/hooks/useStoreSlices';

interface EditorToolbarProps {
  currentTime: number;
  totalDuration: number;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  currentTime,
  totalDuration,
}) => {
  const { undo, redo, canUndo, canRedo } = useNotes();
  const { value: cameraMode, setValue: setCameraMode } = useCameraMode();
  const { value: aspectRatio } = useAspectRatio();
  const { refresh, loading, get: getRhythm } = useRhythmInstance();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

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

  const handleExport = async () => {
    const rhythm = getRhythm();
    if (!rhythm) return;
    setIsExporting(true);
    const exporter = new RhythmExporter(rhythm, {
      quality: QUALITY_MEDIUM,
      aspectRatio,
      aspectRatioHeight: 1080,
      fps: 60,
      onProgress: (progress) => {
        setExportProgress(progress);
      },
    });
    const result = await exporter.export();
    exporter.dispose();
    downloadBlob(result.blob, `output.${result.ext}`);
    setIsExporting(false);
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

      <Button
        variant="ghost"
        size="icon"
        onClick={handleExport}
        title="导出视频"
      >
        {isExporting ? `${(exportProgress * 100).toFixed(1)}%` : <Download className="w-4 h-4" />}
      </Button>
    </div>
  );
};
