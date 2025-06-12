import React from 'react';

export const TimeScale: React.FC<{
  totalDuration: number;
  pxPerSec: number;
}> = React.memo(({ totalDuration, pxPerSec }) => {
  return (
    <div
      className="sticky top-0 z-10 bg-white border-b text-[10px] text-gray-500"
      style={{ width: totalDuration * pxPerSec, height: 20 }}
    >
      {Array.from({ length: Math.ceil(totalDuration) + 1 }, (_, i) => (
        <div
          key={i}
          className="absolute border-l border-gray-300 h-full"
          style={{ left: i * pxPerSec }}
        >
          <div className="absolute left-1 text-xs">{i}s</div>
        </div>
      ))}
    </div>
  );
});
TimeScale.displayName = 'TimeScale';
