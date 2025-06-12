'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { MidiPlayer } from '@/lib/MidiPlayer';
import { NoteLines } from './NoteLines';
import { NoteBlocks } from './NoteBlocks';
import { PianoKeys } from './PianoKeys';
import { midiToNoteName } from '@/lib/Midi';
import { TimeScale } from './TimeScale';
import { CursorLineInside, FixedTrianglePointer } from './TimeCursor';

const rowHeight = 20;
const pxPerSec = 100;



interface MidiNoteEditorProps {
  notes: SerializedNote[];
  onNotesChange: (notes: SerializedNote[]) => void;
  onTimeChange: (time: Seconds) => void;
}

export const MidiNoteEditor: React.FC<MidiNoteEditorProps> = ({
  notes,
  onNotesChange,
  onTimeChange,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
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
    (_, i) => maxPitch - i
  );
  const contentHeight = pitches.length * rowHeight;
  const totalDuration: Seconds = useMemo(() => {
    return Math.max(...notes.map(n => n.time + n.duration), 10) + 10;
  }, [notes]);

  const formatTime = (t: Seconds) => `${(t).toFixed(2)}s`;

  useEffect(() => {
    const handleToggle = (value: boolean) => setIsPlaying(value);
    const handleProgress = (value: number, current: Seconds) => setCurrentTime(current);

    MidiPlayer.on('toggle', handleToggle);
    MidiPlayer.on('progress', handleProgress);

    return () => {
      MidiPlayer.off('toggle', handleToggle);
      MidiPlayer.off('progress', handleProgress);
    };
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onScroll = () => setScrollLeft(el.scrollLeft);
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  const handlePlay = async () => {
    await MidiPlayer.toggle();
  };

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

  const handleNoteMouseDown = (e: React.MouseEvent, index: number) => {
    e.preventDefault();
    const note = notes[index];
    const startX = e.clientX;
    const startY = e.clientY;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      const newTime = Math.max(0, note.time + deltaX / pxPerSec);
      const newMidi = Math.min(
        maxPitch,
        Math.max(minPitch, note.midi - Math.round(deltaY / rowHeight))
      );

      const updated = [...notes];
      updated[index] = {
        ...note,
        time: newTime,
        midi: newMidi,
        name: midiToNoteName(newMidi),
        pitch: midiToNoteName(newMidi),
        octave: Math.floor(newMidi / 12) - 1,
      };
      onNotesChange(updated);
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const toggleDisable = (index: number) => {
    const updated = [...notes];
    updated[index] = { ...updated[index], disabled: !updated[index].disabled };
    onNotesChange(updated);
  };

  return (
    <div className="flex flex-col h-full">
      {/* 🔧 工具栏 */}
      <div className="h-8 flex items-center gap-3 px-3 border-b bg-gray-100 text-sm shrink-0 justify-center">
        <button
          onClick={handlePlay}
          className="text-lg hover:scale-110 transition"
          title={isPlaying ? '暂停' : '播放'}
        >
          {isPlaying ? '⏸️' : '▶️'}
        </button>
        <span className="text-xs text-gray-500">
          {formatTime(currentTime)} / {formatTime(totalDuration)}
        </span>
      </div>

      {/* 🎼 滚动区域 */}
      <div className="flex-1 overflow-auto bg-white relative">
        <div className="flex min-w-max">
          {/* 🎹 左侧钢琴键 */}
          <div
            className="sticky left-0 z-10 w-[60px] shrink-0 bg-white border-r border-gray-300"
            style={{ height: contentHeight + 20 }}
          >
            <PianoKeys pitches={pitches} rowHeight={rowHeight} onClick={(midi) => MidiPlayer.playNote(midi, 300)} />
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
                notes={notes}
                rowHeight={rowHeight}
                pxPerSec={pxPerSec}
                maxPitch={maxPitch}
                onNoteDrag={handleNoteMouseDown}
                toggleDisable={toggleDisable}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
