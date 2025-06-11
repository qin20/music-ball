import * as Tone from 'tone';


interface Options {
  events: MidiNote[];
  synth: Tone.PolySynth | Tone.Sampler;
  transpose?: number;
}

export function createToneTransportPlayer({ events, synth, transpose = 0 }: Options) {
  let part: Tone.Part<MidiNote> | null = null;

  const init = () => {
    if (part) return;
    part = new Tone.Part<MidiNote>((time, e: MidiNote) => {
      const note = Tone.Frequency(e.midi + transpose, 'midi').toNote();
      synth.triggerAttackRelease(note, e.duration / 1000, time);
    }, events.map(e => [e.time / 1000, e] as any));
    part.start(0);
  };

  const start = async (offsetMs = 0) => {
    await Tone.start();
    Tone.Transport.stop();
    Tone.Transport.cancel();
    init();
    Tone.Transport.seconds = offsetMs / 1000;
    Tone.Transport.start();
  };

  const pause = () => {
    Tone.Transport.pause();
  };

  const seek = (ms: number) => {
    Tone.Transport.seconds = ms / 1000;
  };

  const dispose = () => {
    part?.dispose();
    part = null;
    Tone.Transport.stop();
    Tone.Transport.cancel();
  };

  return { start, pause, seek, dispose };
}
