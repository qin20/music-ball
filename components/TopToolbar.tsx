'use client';

import { Button } from '@/components/ui/button';

interface TopToolbarProps {
  onExport: () => void;
  onReset: () => void;
}

export default function TopToolbar({ onExport, onReset }: TopToolbarProps) {
  return (
    <div className="h-12 px-4 py-2 bg-white border-b border-gray-200 flex items-center justify-between shadow-sm">
      <div className="font-semibold text-lg">🎵 音乐小球编辑器</div>
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={onReset}>
          重置
        </Button>
        <Button onClick={onExport}>
          导出
        </Button>
      </div>
    </div>
  );
}
