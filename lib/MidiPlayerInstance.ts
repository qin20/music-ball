import * as Tone from 'tone';
import { withEventEmitter } from './EventEmmiter';

export type SynthType = 'fmsynth' | 'amsynth';

export interface MidiSynthParams {
  harmonicity: number;
  modulationIndex: number;
  attack: number;
  decay: number;
  release: number;
}

export interface MidiPlayerConfig {
  notes?: SerializedNote[];
  synthType: SynthType;
  volume: number;
  transpose: number;
  params: MidiSynthParams;
}

export type MidiPlayerConfigEvents = {
  progress: (percent: number, current: Seconds) => void;
  toggle: (isPlaying: boolean) => void;
  finish: () => void;
};

export class MidiPlayerInstance extends withEventEmitter<MidiPlayerConfigEvents>() {
  private synth: Tone.PolySynth;
  private part?: Tone.Part;
  private rafId?: number;
  public totalDuration: Seconds = 0;
  public isPlaying = false;

  constructor(private config: MidiPlayerConfig) {
    super();

    const { synthType, params, volume } = config;

    const SynthClass = {
      fmsynth: Tone.FMSynth,
      amsynth: Tone.AMSynth
    }[synthType];

    this.synth = new Tone.PolySynth(SynthClass as any).toDestination();
    this.synth.set({
      // @ts-expect-error 这个报错实际上可以运行
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

    if (config.notes && config.notes.length) {
      const events = this.prepareEvents(config.notes);
      this.part = new Tone.Part((time, ev) => {
        const notes = ev.notes.map(n =>
          Tone.Frequency(n.midi + config.transpose, 'midi').toNote()
        );
        this.synth.triggerAttackRelease(notes, ev.duration, time, ev.velocity);
      }, events).start(0);

      this.part.loop = false;
    }
  }

  private prepareEvents(notes: SerializedNote[]) {
    const eventMap = new Map<number, SerializedNote[]>();
    notes.forEach(n => {
      if (!eventMap.has(n.time)) eventMap.set(n.time, []);
      eventMap.get(n.time)!.push(n);
    });

    const events = Array.from(eventMap.entries()).map(([time, notes]) => ({
      time: time,
      notes,
      duration: Math.max(...notes.map(n => n.duration)),
      velocity: Math.max(...notes.map(n => n.velocity), 0.1)
    })).sort((a, b) => a.time - b.time);

    const last = events.at(-1);
    this.totalDuration = last ? last.time + last.duration : 0;

    return events;
  }

  private tickProgress = () => {
    const current = this.getCurrentTime();
    const progress = this.getProgress();
    this.emit('progress', progress, current);
    if (current >= this.totalDuration) {
      this.reset(); // 会 emit toggle(false) 并停止 Transport
      this.emit('finish');
      return;
    }
    this.rafId = requestAnimationFrame(this.tickProgress);
  };

  async play() {
    await Tone.start();
    Tone.Transport.start();
    this.isPlaying = true;
    this.emit('toggle', true);
    this.tickProgress();
  }

  playNote(midi: number, duration: Seconds = 250, velocity: number = 0.8): void {
    const note = Tone.Frequency(midi + this.config.transpose, 'midi').toNote();
    this.synth.triggerAttackRelease(note, duration, undefined, velocity);
  }

  pause() {
    Tone.Transport.pause();
    this.isPlaying = false;
    this.emit('toggle', false);
    if (this.rafId) cancelAnimationFrame(this.rafId);
  }

  reset() {
    Tone.Transport.stop();
    Tone.Transport.seconds = 0;
    this.isPlaying = false;
    this.emit('toggle', false);
    if (this.rafId) cancelAnimationFrame(this.rafId);
  }

  seek(seconds: Seconds) {
    const clamped = Math.max(0, seconds);
    Tone.Transport.seconds = clamped;

    // 同步触发进度事件
    const progress = this.getProgress();
    this.emit('progress', progress, clamped);
  }

  getCurrentTime(): Seconds {
    return Tone.Transport.seconds;
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
    this.part?.dispose();
    this.synth.dispose();
    Tone.Transport.stop();
    this.isPlaying = false;
  }
}
