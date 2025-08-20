'use client';

import React from 'react';
import {
  RectangleHorizontal,
  RectangleVertical,
} from 'lucide-react';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { useAspectRatio } from '@/hooks/useStoreSlices';

export type ResolutionValue = '16:9' | '9:16' | '1:1' | '4:3' | '3:4' | '21:9';

const resolutionOptions: {
  value: ResolutionValue;
  label: string;
  icon: React.ReactNode;
}[] = [
  {
    value: '16:9',
    label: '16:9 横屏',
    icon: <RectangleHorizontal className="w-4 h-4" />,
  },
  {
    value: '9:16',
    label: '9:16 竖屏',
    icon: <RectangleVertical className="w-4 h-4" />,
  },
  {
    value: '1:1',
    label: '1:1 正方形',
    icon: <div className="w-3.5 h-3.5 border border-gray-400" />,
  },
  {
    value: '4:3',
    label: '4:3 标准屏',
    icon: <div className="w-5 h-4 border border-gray-400" />,
  },
   {
    value: '3:4',
    label: '3:4 标准竖屏',
    icon: <div className="w-5 h-4 border border-gray-400" />,
  },
  {
    value: '21:9',
    label: '21:9 超宽屏',
    icon: <div className="w-6 h-2.5 border border-gray-400" />,
  },
];

export const ResolutionSelector: React.FC = () => {
  const { value: aspectRatio, setValue: setAspectRatio } = useAspectRatio();

  const value = aspectRatio.join(':');
  const selected = resolutionOptions.find((opt) => opt.value === value)!;

  return (
    <Select value={value} onValueChange={(v) => setAspectRatio(v.split(':').map((n) => Number(n)) as [number, number])}>
      <SelectTrigger className="w-24 h-10 px-2 text-xs justify-center" title="画面比例">
        {selected.label}
      </SelectTrigger>
      <SelectContent>
        {resolutionOptions.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            <div className="flex items-center gap-2">
              {opt.icon}
              {opt.label}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
