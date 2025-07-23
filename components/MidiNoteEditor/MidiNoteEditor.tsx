'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { MidiPlayer } from '@/lib/MidiPlayer';
import { NoteLines } from './NoteLines';
import { NoteBlocks } from './NoteBlocks';
import { PianoKeys } from './PianoKeys';
import { TimeScale } from './TimeScale';
import { CursorLineInside, FixedTrianglePointer } from './TimeCursor';
import { EditorToolbar } from './EditorToolbar';
import { useStore } from '@/hooks/useStore';

const rowHeight = 20;
const pxPerSec = 200;

interface MidiNoteEditorProps {
  onTimeChange: (time: Seconds) => void;
}

export const MidiNoteEditor: React.FC<MidiNoteEditorProps> = ({
  onTimeChange,
}) => {
  const { value: notes } = useStore<SerializedNote[]>('notes');
  const [currentTime, setCurrentTime] = useState(0);
  const isDraggingRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollLeft, setScrollLeft] = useState(0);

  const midiValues = notes.map(n => n.midi);
  const _minPitch = midiValues.length ? Math.min(...midiValues) : 60;
  const _maxPitch = midiValues.length ? Math.max(...midiValues) : 84;
  const minPitch = _minPitch - 1;
  const maxPitch = _maxPitch + 1;

  const pitches = Array.from(
    { length: maxPitch - minPitch + 1 },
    (_, i) => minPitch + i
  );
  const contentHeight = pitches.length * rowHeight;
  const totalDuration: Seconds = useMemo(() => {
    return Math.max(...notes.map(n => n.time + n.duration), 10) + 10;
  }, [notes]);

  useEffect(() => {
    const handleProgress = (value: number, current: Seconds) => setCurrentTime(current);

    MidiPlayer.get().on('progress', handleProgress);

    return () => {
      MidiPlayer.get().off('progress', handleProgress);
    };
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onScroll = () => setScrollLeft(el.scrollLeft);
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  const handleTimeLineDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;

    const onMouseMove = (moveEvent: MouseEvent) => {
      isDraggingRef.current = true;
      const deltaX = moveEvent.clientX - startX;
      const newTime = Math.max(0, Math.min(totalDuration, currentTime + deltaX / pxPerSec));
      onTimeChange(newTime);
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  return (
    <div className="flex flex-col h-full">
      {/* 🔧 工具栏 */}
      <EditorToolbar
        currentTime={currentTime}
        totalDuration={totalDuration}
      />

      {/* 🎼 滚动区域 */}
      <div className="flex-1 overflow-auto bg-white relative">
        <div className="flex min-w-max">
          {/* 🎹 左侧钢琴键 */}
          <div
            className="sticky left-0 z-[100] w-[60px] shrink-0 bg-white border-r border-gray-300"
            style={{ height: contentHeight + 20 }}
          >
            <PianoKeys pitches={pitches} rowHeight={rowHeight} onClick={(midi) => MidiPlayer.get().playNote(midi, 300)} />
          </div>

          {/* 🎵 note 区域 */}
          <div className="relative flex flex-col">
            {/* 时间刻度条 */}
            <TimeScale totalDuration={totalDuration} pxPerSec={pxPerSec} />
            <FixedTrianglePointer
              currentTime={currentTime}
              pxPerSec={pxPerSec}
              scrollLeft={scrollLeft}
            />
            {/* 音符区域 */}
            <div
              className="relative"
              style={{ width: totalDuration * pxPerSec, height: contentHeight }}
            >
              {/* 🎚️ 时间指针线（含倒三角 + hover 变色） */}
              <CursorLineInside
                currentTime={currentTime}
                pxPerSec={pxPerSec}
                contentHeight={contentHeight}
                onMouseDown={handleTimeLineDrag}
              />

              {/* 背景横线 */}
              <NoteLines pitches={pitches} rowHeight={rowHeight} />

              {/* 🎶 音符块 */}
              <NoteBlocks
                rowHeight={rowHeight}
                pxPerSec={pxPerSec}
                minPitch={pitches[0]}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
