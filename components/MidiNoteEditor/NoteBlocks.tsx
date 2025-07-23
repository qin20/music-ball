'use client';

import { MidiPlayer } from '@/lib/MidiPlayer';
import { midiToNoteName } from '@/lib/Midi';
import { useStore } from '@/hooks/useStore';
import React, { useState } from 'react';
import { Eye, EyeOff, ArrowUp, ArrowDown, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NoteBlocksProps {
  rowHeight: number;
  pxPerSec: number;
  minPitch: number;
}

export const NoteBlocks: React.FC<NoteBlocksProps> = React.memo(
  ({ rowHeight, pxPerSec, minPitch }) => {
    const {
      defaultValue: defaultNotes,
      value: notes,
      setValue: setNotes,
    } = useStore<SerializedNote[]>('notes');

    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    const handleNoteMouseDown = (e: React.MouseEvent, index: number) => {
      e.preventDefault();
      const note = notes[index];
      const startX = e.clientX;

      let finalNote = note;

      const onMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = moveEvent.clientX - startX;
        const newTime = Math.max(0, note.time + deltaX / pxPerSec);

        const updated = [...notes];
        finalNote = {
          ...note,
          time: newTime,
        };
        updated[index] = finalNote;
        setNotes(updated, { skipHistory: true });
      };

      const onMouseUp = () => {
        const updated = [...notes];
        updated[index] = finalNote;
        setNotes(updated);
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    };


    const toggleDisable = (index: number) => {
      const updated = [...notes];
      updated[index] = {
        ...updated[index],
        disabled: !updated[index].disabled,
      };
      setNotes(updated);
    };

    const shiftMidi = (index: number, delta: number) => {
      const updated = [...notes];
      const note = updated[index];
      const newMidi = Math.max(0, note.midi + delta);
      updated[index] = {
        ...note,
        midi: newMidi,
        name: midiToNoteName(newMidi),
      };
      setNotes(updated);
    };

    const resetNote = (index: number) => {
      const updated = [...notes];
      updated[index] = { ...defaultNotes[index] };
      setNotes(updated);
    };

    return notes.map((note, i) => {
      const isHovered = hoveredIndex === i;
      const x = note.time * pxPerSec;
      const y = (note.midi - minPitch) * rowHeight + 1;
      return (
        <div
          key={i}
          className="absolute"
          style={{
            left: x,
            top: y,
            width: note.duration * pxPerSec,
            height: rowHeight - 2,
          }}
          onMouseEnter={() => {
            setHoveredIndex(i);
          }}
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <div
            className={`group relative rounded text-[10px] text-white flex items-center justify-center w-full h-full
              ${note.disabled ? 'bg-gray-400' : 'bg-blue-500'}
              ${selectedIndex === i ? 'ring-2 ring-yellow-300' : ''}
            `}
            onMouseDown={(e) => handleNoteMouseDown(e, i)}
            onClick={() => {
              setSelectedIndex(i);
              MidiPlayer.get().playNote(note.midi);
            }}
          >
            {note.name}
          </div>

          {/* 工具栏在这里渲染，避免 mouseleave 闪退 */}
          {isHovered && (
            <div
              className="absolute z-50 bg-white border border-gray-200 rounded-md shadow-md flex gap-1 p-1"
              style={{
                left: '50%',
                top: 0,
                transform: 'translate(-50%, -100%)',
              }}
            >
              <Button
                variant="ghost"
                size="icon"
                className="w-6 h-6"
                onClick={(e) => {
                  e.stopPropagation();
                  shiftMidi(i, 1);
                }}
                title="升高音高"
              >
                <ArrowUp size={14} />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="w-6 h-6"
                onClick={(e) => {
                  e.stopPropagation();
                  shiftMidi(i, -1);
                }}
                title="降低音高"
              >
                <ArrowDown size={14} />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="w-6 h-6"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleDisable(i);
                }}
                title={note.disabled ? '启用音符' : '禁用音符'}
              >
                {note.disabled ? <EyeOff size={14} /> : <Eye size={14} />}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="w-6 h-6"
                onClick={(e) => {
                  e.stopPropagation();
                  resetNote(i);
                }}
                title="还原为初始状态"
              >
                <RotateCcw size={14} />
              </Button>

            </div>
          )}
        </div>
      );
    })
  }
);

NoteBlocks.displayName = 'NoteBlocks';
