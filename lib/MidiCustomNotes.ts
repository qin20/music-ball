import { midiToNoteName } from "./Midi";

export function createGlissandoIntro(transpose: number = 0, count: number = 28): SerializedNote[] {
  const notes: SerializedNote[] = [];
  const direction = Math.random() > 0.5 ? 'H' : 'V';

  const slowMidis = [68, 69, 70].map((mid) => mid + transpose);
  const slowTimings = [0.0, 0.4, 0.6];
  const slowDurations = [1, 0.8, 0.65];

  for (let i = 0; i < slowMidis.length; i++) {
    notes.push({
      time: slowTimings[i],
      midi: slowMidis[i],
      name: midiToNoteName(slowMidis[i]),
      duration: slowDurations[i],
      direction: direction,
    });
  }

  // ⚡ 紧凑段从最后一个缓慢音符往上推
  const fastStartMidi = slowMidis.at(-1)! + 1; // 72 + 1 = 73
  const fastStartTime = 1.5;
  const fastDuration = 0.05;

  for (let i = 0; i < count; i++) {
    const midi = fastStartMidi + i;
    notes.push({
      time: fastStartTime + i * fastDuration,
      midi,
      name: midiToNoteName(midi),
      duration: fastDuration,
      direction: direction === 'H' ? 'V' : 'H',
    });
  }

  return notes;
}
