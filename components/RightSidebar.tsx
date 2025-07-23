import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import MidiPlayerUI from './MidiPlayerUI';

interface RightSidebarProps {
  speed: number;
  onSpeedChange: (value: number) => void;
  characterSize: number;
  onCharacterSizeChange: (value: number) => void;
}

export function RightSidebar({
  speed,
  onSpeedChange,
  characterSize,
  onCharacterSizeChange,
}: RightSidebarProps) {
  return (
    <div className="w-128 bg-gray-100 text-sm p-4 space-y-4 overflow-y-auto border-l border-gray-300">
      <div className="p-3 bg-white rounded border space-y-2">
        <Label htmlFor="slider-size" className="font-medium block mb-4">Midi文件</Label>
        <MidiPlayerUI />
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
    </div>
  );
}
