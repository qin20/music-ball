import * as Tone from 'tone';

export type SynthType = 'fmsynth' | 'amsynth';

export interface MidiNote {
  time: number;
  pitch: string;
  duration: number;
  velocity: number;
  solfege: string;
  delta: number;
  midi: number;
}

export interface MidiSynthParams {
  harmonicity: number;
  modulationIndex: number;
  attack: number;
  decay: number;
  release: number;
}

export interface MidiPlayerConfig {
  notes: MidiNote[];
  synthType: SynthType;
  volume: number;
  transpose: number;
  params: MidiSynthParams;
}

export class MidiPlayerInstance {
  private synth: Tone.PolySynth;
  private part: Tone.Part;
  public totalDuration = 0;
  public isPlaying = false;

  constructor(private config: MidiPlayerConfig) {
    const { synthType, params, volume } = config;

    const SynthClass = {
      fmsynth: Tone.FMSynth,
      amsynth: Tone.AMSynth
    }[synthType];

    this.synth = new Tone.PolySynth(SynthClass as any).toDestination();
    this.synth.set({
      harmonicity: params.harmonicity,
      modulationIndex: params.modulationIndex,
      envelope: {
        attack: params.attack,
        decay: params.decay,
        sustain: 0,
        release: params.release
      }
    });
    this.synth.volume.value = volume;

    const events = this.prepareEvents(config.notes);
    this.part = new Tone.Part((time, ev) => {
      const notes = ev.notes.map(n =>
        Tone.Frequency(n.midi + config.transpose, 'midi').toNote()
      );
      this.synth.triggerAttackRelease(notes, ev.duration, time, ev.velocity);
    }, events).start(0);

    this.part.loop = false;
  }

  private prepareEvents(notes: MidiNote[]) {
    const eventMap = new Map<number, MidiNote[]>();
    notes.forEach(n => {
      if (!eventMap.has(n.time)) eventMap.set(n.time, []);
      eventMap.get(n.time)!.push(n);
    });

    const events = Array.from(eventMap.entries()).map(([time, notes]) => ({
      time: time / 1000,
      notes,
      duration: Math.max(...notes.map(n => n.duration)) / 1000,
      velocity: Math.max(...notes.map(n => n.velocity), 0.1)
    })).sort((a, b) => a.time - b.time);

    const last = events.at(-1);
    this.totalDuration = last ? last.time + last.duration : 0;

    return events;
  }

  async play() {
    await Tone.start();
    Tone.Transport.start();
    this.isPlaying = true;
  }

  pause() {
    Tone.Transport.pause();
    this.isPlaying = false;
  }

  reset() {
    Tone.Transport.stop();
    Tone.Transport.seconds = 0;
    this.isPlaying = false;
  }

  seek(seconds: number) {
    Tone.Transport.seconds = Math.max(0, seconds);
  }

  getProgress(): number {
    return this.totalDuration > 0
      ? Tone.Transport.seconds / this.totalDuration
      : 0;
  }

  async exportToWebM(): Promise<Blob> {
    const dest = Tone.context.createMediaStreamDestination();
    this.synth.connect(dest);
    const recorder = new MediaRecorder(dest.stream);
    const chunks: Blob[] = [];

    recorder.ondataavailable = e => chunks.push(e.data);
    recorder.onstop = () => void 0;

    await Tone.start();
    this.reset();
    recorder.start();
    this.play();

    return new Promise((resolve) => {
      setTimeout(() => {
        recorder.stop();
        this.pause();
        resolve(new Blob(chunks, { type: 'audio/webm' }));
      }, this.totalDuration * 1000);
    });
  }

  dispose() {
    this.part.dispose();
    this.synth.dispose();
    Tone.Transport.stop();
    this.isPlaying = false;
  }
}
