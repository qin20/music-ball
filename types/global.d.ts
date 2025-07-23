// global.d.ts
type Milliseconds = number;
type Seconds = number;
type Direction = 'H' | 'V';
type SerializedNote = {
  time: Seconds
  name: string
  midi: number
  duration: Seconds
  disabled?: boolean;
  direction?: Direction;
  _note?: {
    velocity: number;
  }
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
