// 🔸 components/NoteBlocks.tsx
import { MidiPlayer } from '@/lib/MidiPlayer';
import React, { useState } from 'react';

interface NoteBlocksProps {
  notes: SerializedNote[];
  rowHeight: number;
  pxPerSec: number;
  maxPitch: number;
  onNoteDrag: (e: React.MouseEvent, index: number) => void;
  toggleDisable: (index: number) => void;
}

export const NoteBlocks: React.FC<NoteBlocksProps> = React.memo(
  ({ notes, rowHeight, pxPerSec, maxPitch, onNoteDrag, toggleDisable }) => {
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

    return (
      <>
        {notes.map((note, i) => (
          <div
            key={i}
            className={`absolute rounded text-[10px] text-white flex items-center justify-center
              ${note.disabled ? 'bg-gray-400' : 'bg-blue-500'}
              ${selectedIndex === i ? 'ring-2 ring-yellow-300 z-10' : ''}`}
            style={{
              left: note.time * pxPerSec,
              top: (maxPitch - note.midi) * rowHeight + 1,
              width: note.duration * pxPerSec,
              height: rowHeight - 2,
            }}
            onMouseDown={(e) => onNoteDrag(e, i)}
            onClick={() => {
              setSelectedIndex(i);
              MidiPlayer.playNote(note.midi);
            }}
          >
            {note.name}
            <button
              className="ml-1 text-[10px] bg-white text-black rounded px-1"
              onClick={(e) => {
                e.stopPropagation();
                toggleDisable(i);
              }}
            >
              {note.disabled ? '启' : '禁'}
            </button>
          </div>
        ))}
      </>
    );
  }
);
NoteBlocks.displayName = 'NoteBlocks';
