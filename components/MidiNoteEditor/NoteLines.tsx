// 🔸 components/NoteLines.tsx
import React from 'react';

export const NoteLines: React.FC<{ pitches: number[]; rowHeight: number }> = React.memo(
  ({ pitches, rowHeight }) => {
    return (
      <>
        {pitches.map((_, i) => (
          <div
            key={i}
            className="absolute left-0 right-0 border-t border-dashed border-gray-200"
            style={{ top: i * rowHeight, height: rowHeight }}
          />
        ))}
      </>
    );
  }
);
NoteLines.displayName = 'NoteLines';
