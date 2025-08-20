import { Label } from '@/components/ui/label';
import MidiPlayerUI from './MidiPlayerUI';

export function RightSidebar() {
  return (
    <div className="w-128 bg-gray-100 text-sm p-4 space-y-4 overflow-y-auto border-l border-gray-300">
      <div className="p-3 bg-white rounded border space-y-2">
        <Label htmlFor="slider-size" className="font-medium block mb-4">Midi文件</Label>
        <MidiPlayerUI />
      </div>
    </div>
  );
}
