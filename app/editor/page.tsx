'use client';

import { useState } from 'react';
import TopToolbar from '@/components/TopToolbar';
import LeftSidebar from '@/components/LeftSidebar';
import CanvasPreview from '@/components/CanvasPreview';

interface RhythmEvent {
  time: number;
  delta: number;
  midi: number;
  pitch: string;
  solfege: string;
  duration: number;
  velocity: number;
}

export default function EditorPage() {
  const [speed, setSpeed] = useState(0.25);
  const [theme, setTheme] = useState('default');
  const [characterSize, setCharacterSize] = useState(40);
  const [resolution, setResolution] = useState<'16:9' | '9:16'>('16:9');
  const [cameraMode, setCameraMode] = useState<'fit' | 'pixel'>('fit');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [events, setEvents] = useState<RhythmEvent[] | null>(null);

  const handleMidiFileChange = (url: string | null, parsedEvents: RhythmEvent[]) => {
    setAudioUrl(url);
    setEvents(parsedEvents);
  };

  const handleExport = () => {
    console.log('导出中...');
  };

  const handleReset = () => {
    window.location.reload();
  };

  const toggleCameraMode = () => {
    setCameraMode(prev => (prev === 'fit' ? 'pixel' : 'fit'));
  };

  return (
    <div className="flex flex-col h-screen">
      <TopToolbar onExport={handleExport} onReset={handleReset} />

      <div className="flex flex-1 overflow-hidden">
        <LeftSidebar
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
          onMidiFileChange={handleMidiFileChange}
        />

        <div className="flex-1 bg-gray-50 relative">
          {events && (
            <CanvasPreview
              resolution={resolution}
              events={events}
              audioUrl={audioUrl}
              speed={speed}
              theme={theme}
              characterSize={characterSize}
              onProgress={() => {}}
            />
          )}
        </div>
      </div>
    </div>
  );
}
