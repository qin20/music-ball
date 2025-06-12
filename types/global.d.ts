// global.d.ts
type SynthType = 'metal' | 'fm' | 'am' | 'mono' | 'piano' | 'drum';
type ToneSynthString = 'synth' | 'fmsynth' | 'amsynth' | 'monosynth';
type Milliseconds = number;
type Seconds = number;
type SerializedNote = {
  time: Seconds
  name: string
  midi: number
  duration: Seconds
  velocity: number
  durationTicks: number
  noteOffVelocity: number
  ticks: number
  bars: number
  pitch: string
  octave: number
  disabled?: boolean;
}
// type MidiNote = {
//   time: number;
//   pitch: string;
//   duration: number;
//   velocity: number;
//   solfege: string;
//   delta: number;
//   midi: number;
// };
// type ParsedMidiNote = MidiNote;
