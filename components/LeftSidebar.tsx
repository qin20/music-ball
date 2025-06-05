'use client';

import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

interface RhythmEvent {
  time: number;
  delta: number;
  midi: number;
  pitch: string;
  solfege: string;
  duration: number;
  velocity: number;
}

interface LeftSidebarProps {
  speed: number;
  onSpeedChange: (value: number) => void;
  theme: string;
  onThemeChange: (value: string) => void;
  characterSize: number;
  onCharacterSizeChange: (value: number) => void;
  resolution: '16:9' | '9:16';
  onResolutionChange: (value: '16:9' | '9:16') => void;
  cameraMode: 'fit' | 'pixel';
  onCameraModeToggle: () => void;
  onMidiFileChange: (audioUrl: string | null, events: RhythmEvent[]) => void;
}

async function uploadMidiFile(file: File): Promise<RhythmEvent[]> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('http://localhost:3001/midi/parse', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) throw new Error('MIDI 文件解析失败');
  return await response.json();
}

export default function LeftSidebar({
  speed,
  onSpeedChange,
  theme,
  onThemeChange,
  characterSize,
  onCharacterSizeChange,
  resolution,
  onResolutionChange,
  cameraMode,
  onCameraModeToggle,
  onMidiFileChange
}: LeftSidebarProps) {
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const name = file.name.toLowerCase();
    if (!name.endsWith('.mid') && !name.endsWith('.midi')) {
      console.warn('请上传 MIDI 文件');
      return;
    }

    try {
      const events = await uploadMidiFile(file);
      onMidiFileChange(null, events);
    } catch (err) {
      console.error('MIDI 文件处理失败:', err);
    }
  };

  return (
    <div className="w-64 bg-gray-100 text-sm p-4 space-y-4 overflow-y-auto border-r border-gray-300">
      <div>
        <Label className="mb-1 block">小球大小</Label>
        <input
          type="range"
          min={10}
          max={100}
          value={characterSize}
          onChange={(e) => onCharacterSizeChange(parseInt(e.target.value))}
          className="w-full"
        />
        <div className="text-right text-xs">{characterSize}px</div>
      </div>

      <div>
        <Label className="mb-1 block">速度</Label>
        <input
          type="range"
          min={0.05}
          max={2}
          step={0.05}
          value={speed}
          onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
          className="w-full"
        />
        <div className="text-right text-xs">{speed.toFixed(2)}</div>
      </div>

      <div>
        <Label className="mb-1 block">主题</Label>
        <Select value={theme} onValueChange={onThemeChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="选择主题" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">默认</SelectItem>
            <SelectItem value="night">夜色</SelectItem>
            <SelectItem value="ice">冰蓝</SelectItem>
            <SelectItem value="fire">火焰</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="mb-1 block">画面比例</Label>
        <Select value={resolution} onValueChange={(v) => onResolutionChange(v as '16:9' | '9:16')}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="选择比例" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="16:9">16:9 横屏</SelectItem>
            <SelectItem value="9:16">9:16 竖屏</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="mb-1 block">镜头模式</Label>
        <Button onClick={onCameraModeToggle} className="w-full" variant="secondary">
          {cameraMode === 'fit' ? '自适应画面' : '拟真镜头'}
        </Button>
      </div>

      <div>
        <Label className="mb-1 block">导入 MIDI 文件</Label>
        <input
          type="file"
          accept=".mid,.midi"
          onChange={handleFileSelect}
          className="w-full text-xs"
        />
      </div>
    </div>
  );
}
