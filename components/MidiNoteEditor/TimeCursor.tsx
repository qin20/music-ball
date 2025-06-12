import React from 'react';

export const FixedTrianglePointer: React.FC<{
  currentTime: number;
  pxPerSec: number;
  scrollLeft: number;
}> = ({ currentTime, pxPerSec, scrollLeft }) => {
  const triangleHeight = 10;
  const left = currentTime * pxPerSec - scrollLeft;

  return (
    <div
      className="absolute z-50 pointer-events-none"
      style={{
        top: 12,
        left: left,
        width: 0,
        height: 0,
        transform: 'translateX(-50%)',
        borderLeft: '8px solid transparent',
        borderRight: '8px solid transparent',
        borderTop: `${triangleHeight}px solid #fb7185`,
      }}
    />
  );
};

export const CursorLineInside: React.FC<{
  currentTime: number;
  pxPerSec: number;
  contentHeight: number;
  onMouseDown: (e: React.MouseEvent) => void;
}> = ({ currentTime, pxPerSec, contentHeight, onMouseDown }) => {
  return (
    <div
      className="absolute z-40 group cursor-ew-resize"
      style={{
        left: currentTime * pxPerSec,
        top: 0,
        width: 20,
        height: contentHeight,
        transform: 'translateX(-50%)',
      }}
      onMouseDown={onMouseDown}
    >
      <div className="absolute top-0 bottom-0 left-1/2 w-[2px] -translate-x-1/2 bg-rose-400 group-hover:bg-rose-600" />
    </div>
  );
};
