import React from 'react';
import { midiToNoteName } from "@/lib/Midi";

const isBlackKey = (midi: number) => [1, 3, 6, 8, 10].includes(midi % 12);

export const PianoKeys: React.FC<{
  pitches: number[];
  rowHeight: number;
  onClick: (midi: number) => void;
}> = React.memo(({ pitches, rowHeight, onClick }) => {
  return (
    <>
      <div style={{ height: 20 }} /> {/* 空出刻度区域 */}
      {pitches.map((midi) => (
        <div
          key={midi}
          className={`text-xs flex items-center justify-center cursor-pointer select-none
            ${isBlackKey(midi) ? 'bg-black text-white' : 'bg-white'}
            border-b border-gray-200 hover:bg-gray-300`}
          style={{ height: rowHeight }}
          onClick={() => onClick(midi)}
        >
          {midiToNoteName(midi)}
        </div>
      ))}
    </>
  );
});
PianoKeys.displayName = 'PianoKeys';
