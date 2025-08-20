import { Midi, Track } from '@tonejs/midi'

/* =========================================================
 *                 🎹 Helper: MIDI → 音名 / 唱名
 * ========================================================= */

const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']
const SOLFEGE_MAP: Record<string,string> = {
  C:'do','C#':'do#',D:'re','D#':'re#',E:'mi',F:'fa','F#':'fa#',
  G:'sol','G#':'sol#',A:'la','A#':'la#',B:'ti'
}
export function midiToNames(midi: number) {
  const note = NOTE_NAMES[midi % 12]
  const octave = Math.floor(midi / 12) - 1
  return { pitch: `${note}${octave}`, solfege: SOLFEGE_MAP[note] }
}
export function midiToNoteName(midi: number) {
  return NOTE_NAMES[midi % 12] + (Math.floor(midi / 12) - 1);
}
export function noteNameToMidi(name: string): number {
  name = name.toUpperCase();
  const match = /^([A-G]#?)(-?\d+)$/.exec(name);
  if (!match) throw new Error(`Invalid note name: ${name}`);
  const [, note, octaveStr] = match;
  const octave = parseInt(octaveStr, 10);
  const semitone = NOTE_NAMES.indexOf(note);
  if (semitone < 0) throw new Error(`Unknown note: ${note}`);
  return (octave + 1) * 12 + semitone;
}
/* =========================================================
 *           📅  Parse & Serialize MIDI  Tracks
 * ========================================================= */

export function serializeNotes(notes: Track['notes']): SerializedNote[] {
  return notes.map((n) => ({
    time          : n.time,
    name          : n.name,
    midi          : n.midi,
    duration      : n.duration,
    _note         : n,
  }))
}

export function getMainTrackIndex(tracks: Track[]): number {
  const melodyRange = [50, 90]; // 主旋律常见音高范围
  const centerPitch = 64;

  return tracks
    .map((t, i) => {
      const notes = t.notes;

      if (!notes.length) return { i, score: -Infinity };

      const avgPitch = notes.reduce((s, n) => s + n.midi, 0) / notes.length;
      const lowPitchRatio = notes.filter(n => n.midi < melodyRange[0]).length / notes.length;
      const outOfRangeRatio = notes.filter(n => n.midi < melodyRange[0] || n.midi > melodyRange[1]).length / notes.length;

      const isPercussion = t.channel === 9; // channel 10 is percussion

      const score =
        isPercussion
          ? -Infinity
          : notes.length * 10
            - Math.abs(avgPitch - centerPitch) * 2
            - lowPitchRatio * 50
            - outOfRangeRatio * 30;

      return { i, score };
    })
    .sort((a, b) => b.score - a.score)[0].i;
}

export function sortTracksByAvgPitch(tracks: Track[]) {
  return tracks
    .map((track, index) => {
      const notes = track.notes;
      const avgPitch =
        notes.length === 0
          ? -Infinity
          : notes.reduce((sum, n) => sum + n.midi, 0) / notes.length;
      return { index, track, avgPitch };
    })
    .sort((a, b) => b.avgPitch - a.avgPitch);
}

/* =========================================================
 *                🚀  Entry: Extract Main Notes
 * ========================================================= */

export async function getMainTrack(input: File|ArrayBuffer) {
  const buffer = input instanceof File ? await input.arrayBuffer() : input
  const midi =  new Midi(buffer)
  const tracks = sortTracksByAvgPitch(midi.tracks);
  console.log(tracks);
  return tracks[0].track;
}

export function sliceNotesByTime(
  notes: SerializedNote[],
  startTime: Seconds = 0,
  endTime: Seconds = Infinity
): SerializedNote[] {
  return notes.filter(n => {
    const noteEnd = n.time + n.duration;
    return (
      noteEnd > startTime &&               // 有部分落在开始之后
      (endTime === undefined || n.time < endTime) // 有部分在结束之前
    );
  });
}


export function scaleNoteTimings(notes: SerializedNote[], factor: number): SerializedNote[] {
  const digists = 10e3;
  return notes.map(note => ({
    ...note,
    time: Math.floor(note.time * factor * digists) / digists,
    duration: Math.floor(note.duration * factor * digists) / digists,
  }));
}

export function deleteNotesBelow(
  notes: SerializedNote[],
  thresholdName: string
): SerializedNote[] {
  const threshold = noteNameToMidi(thresholdName);
  return notes.filter(n => n.midi > threshold);
}

export function compressNotes(notes: SerializedNote[], minDelta = 0): SerializedNote[] {
  if (!notes.length) return notes;

  const EPSILON = 1e-6;
  const compressed: SerializedNote[] = [];
  let group: SerializedNote[] = [];

  for (let i = 0; i < notes.length; i++) {
    const note = notes[i];

    if (group.length === 0) {
      group.push(note);
    } else {
      const anchor = group[0];
      const delta = note.time - anchor.time;

      if (delta < minDelta - EPSILON) {
        group.push(note);
      } else {
        compressed.push({ ...anchor });
        group = [note];
      }
    }
  }

  if (group.length > 0) {
    compressed.push({ ...group[0] });
  }

  const originalFirstDelta = notes[1].time - notes[0].time;

  return compressed.map((curr, i) => {
    const prev = compressed[i - 1];
    return {
      ...curr,
      delta: i === 0 ? originalFirstDelta : curr.time - prev.time
    };
  });
}

export function concatNotes(...noteGroups: SerializedNote[][]): SerializedNote[] {
  let timeOffset = 0;
  const result: SerializedNote[] = [];

  for (const group of noteGroups) {
    const shifted = group.map(note => ({
      ...note,
      time: note.time + timeOffset,
    }));

    result.push(...shifted);

    if (group.length > 0) {
      const last = group.at(-1)!;
      const groupStartTime = group[0].time;
      timeOffset += last.time + last.duration - groupStartTime;
    }
  }

  return result;
}

export function computeMidiCenter(notes: SerializedNote[]): number {
  const midis = notes.map(n => n.midi).filter(m => m >= 0 && m <= 127);
  if (midis.length === 0) return 60;

  midis.sort((a, b) => a - b);
  const median = midis[Math.floor(midis.length / 2)];
  return median;
}

export function getNoteColor(midi: number, centerMidi: number = 60): string {
  const NOTE_HUES: Record<string, number> = {
    'C': 40,   // 橙黄
    'C#': 70,  // 黄
    'D': 100,  // 黄绿
    'D#': 140, // 绿
    'E': 170,  // 青绿
    'F': 200,  // 蓝绿
    'F#': 230, // 蓝
    'G': 260,  // 靛蓝
    'G#': 280, // 紫
    'A': 300,  // 紫红（偏紫，不算红）
    'A#': 320, // 暗紫（接近红，但仍然带蓝调）
    'B': 50,   // 橙
  };

  const noteName = midiToNoteName(midi);
  const pitch = noteName.replace(/[0-9]/g, '');
  const hue = NOTE_HUES[pitch] ?? 0;

  const delta = midi - centerMidi;
  const lightness = Math.max(45, Math.min(75, 60 + delta * 0.5));

  return `hsl(${hue}, 100%, ${lightness.toFixed(1)}%)`;
}

/**
 * 对一组音符整体进行时间偏移
 * @param notes 音符数组
 * @param offset 偏移时间，正数向后，负数向前
 * @returns 偏移后的音符数组
 */
export function shiftNotesTime(notes: SerializedNote[], offset: number): SerializedNote[] {
  return notes.map(note => ({
    ...note,
    time: note.time + offset
  }));
}

/**
 * 将一组 notes 的起始时间调整为指定时间（默认 3s）
 * 保持所有音符的相对节奏不变
 * @param notes 要调整的音符组
 * @param startTime 目标开始时间（单位：秒），默认 3 秒
 * @returns 调整后的 notes
 */
export function alignNotesStartTime(notes: SerializedNote[], startTime: number = 3): SerializedNote[] {
  if (!notes.length) return notes;

  const delta = startTime - notes[0].time;
  return shiftNotesTime(notes, delta);
}

/**
 * 获取小球动画事件和音乐事件
 * @param tracks
 * @param disabledIndexes
 * @returns
 */
export function serializeTrack(track: Track): SerializedNote[] {
  let notes = sliceNotesByTime(serializeNotes(track.notes), 68, 150);
  notes = scaleNoteTimings(notes, 1); // 加速、减速
  notes = deleteNotesBelow(notes, 'b3'); // 删除阈值以下的节点
  return notes;
}
