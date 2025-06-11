// global.d.ts
type SynthType = 'metal' | 'fm' | 'am' | 'mono' | 'piano' | 'drum';
type ToneSynthString = 'synth' | 'fmsynth' | 'amsynth' | 'monosynth';
type MidiNote = {
  time: number;
  pitch: string;
  duration: number;
  velocity: number;
  solfege: string;
  delta: number;
  midi: number;
  originIndex: number;
};
