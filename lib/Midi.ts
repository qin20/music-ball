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
};
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
  return tracks
    .map((t,i)=>({
      i,
      score: !t.notes.length
        ? -Infinity
        : t.notes.length*10 - Math.abs(
            t.notes.reduce((s,n)=>s+n.midi,0)/t.notes.length - 64
          )
    }))
    .sort((a,b)=>b.score-a.score)[0].i
}

/* =========================================================
 *                🚀  Entry: Extract Main Notes
 * ========================================================= */

export async function getMainTrack(input: File|ArrayBuffer) {
  const buffer = input instanceof File ? await input.arrayBuffer() : input
  const midi =  new Midi(buffer)
  const tracks = midi.tracks;
  return tracks[getMainTrackIndex(tracks)];
}

/**
 * 获取小球动画事件和音乐事件
 * @param tracks
 * @param disabledIndexes
 * @returns
 */
export function serializeTrack(track: Track): SerializedNote[] {
  // eslint-disable-next-line
  let notes = serializeNotes(track.notes)
  // notes = notes.slice(0, 15)
  console.log(notes);
  return notes;
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
    'C': 0, 'C#': 150, 'D': 30, 'D#': 180,
    'E': 60, 'F': 210, 'F#': 90, 'G': 240,
    'G#': 120, 'A': 270, 'A#': 330, 'B': 300,
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
