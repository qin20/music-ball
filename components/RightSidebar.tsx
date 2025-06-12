import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import MidiPlayerUI from './MidiPlayerUI';

interface RightSidebarProps {
  speed: number;
  onSpeedChange: (value: number) => void;
  characterSize: number;
  onCharacterSizeChange: (value: number) => void;
  resolution: '16:9' | '9:16';
  onResolutionChange: (value: '16:9' | '9:16') => void;
  cameraMode: 'fit' | 'pixel';
  onCameraModeToggle: () => void;
  onNotesChange: (events: SerializedNote[]) => void;
}

export default function RightSidebar({
  speed,
  onSpeedChange,
  characterSize,
  onCharacterSizeChange,
  resolution,
  onResolutionChange,
  cameraMode,
  onCameraModeToggle,
  onNotesChange,
}: RightSidebarProps) {
  return (
    <div className="w-128 bg-gray-100 text-sm p-4 space-y-4 overflow-y-auto border-l border-gray-300">
      <div className="p-3 bg-white rounded border space-y-2">
        <Label htmlFor="slider-size" className="font-medium block mb-4">Midi文件</Label>
        <MidiPlayerUI onNotesChange={onNotesChange} />
      </div>
      {/* 小球大小 */}
      <div className="p-3 bg-white rounded border space-y-2">
        <Label htmlFor="slider-size" className="font-medium block mb-4">小球大小</Label>
        <Slider
          id="slider-size"
          min={10}
          max={100}
          step={1}
          value={[characterSize]}
          onValueChange={(v) => onCharacterSizeChange(v[0])}
        />
        <div className="text-right text-xs text-gray-500">{characterSize}px</div>
      </div>

      {/* 速度控制 */}
      <div className="p-3 bg-white rounded border space-y-2">
        <Label htmlFor="slider-speed" className="font-medium block mb-4">节奏速度</Label>
        <Slider
          id="slider-speed"
          min={0.05}
          max={2}
          step={0.05}
          value={[speed]}
          onValueChange={(v) => onSpeedChange(parseFloat(v[0].toFixed(2)))}
        />
        <div className="text-right text-xs text-gray-500">{speed.toFixed(2)}</div>
      </div>


      {/* 分辨率 */}
      <div className="p-3 bg-white rounded border space-y-2">
        <Label htmlFor="select-resolution" className="font-medium block mb-4">画面比例</Label>
        <Select value={resolution} onValueChange={(v) => onResolutionChange(v as '16:9' | '9:16')}>
          <SelectTrigger id="select-resolution" className="w-full">
            <SelectValue placeholder="选择比例" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="16:9">16:9 横屏</SelectItem>
            <SelectItem value="9:16">9:16 竖屏</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 镜头模式 */}
      <div className="p-3 bg-white rounded border space-y-2">
        <Label className="font-medium block mb-4">镜头模式</Label>
        <Button onClick={onCameraModeToggle} className="w-full" variant="secondary">
          {cameraMode === 'fit' ? '自适应画面' : '拟真镜头'}
        </Button>
      </div>

    </div>
  );
}
