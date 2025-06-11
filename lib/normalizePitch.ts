export function normalizePitch(pitch: string): string {
  const match = pitch.match(/^([A-G]#?)(\d)$/);
  if (!match) return pitch;
  const [, note, octaveStr] = match;
  let octave = parseInt(octaveStr, 10);
  if (octave < 4) octave += 1; // 升一个八度
  return `${note}${octave}`;
}
