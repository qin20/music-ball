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

// 默认配置
const defaultConfig: MidiPlayerConfig = {
  notes: [],
  synthType: 'fmsynth',
  volume: 0,
  transpose: 0,
  params: {
    harmonicity: 1,
    modulationIndex: 10,
    attack: 0.01,
    decay: 0.1,
    release: 1
  }
};

export class MidiPlayer extends withEventEmitter<MidiPlayerConfigEvents>() {
  private synth!: Tone.PolySynth;
  private part?: Tone.Part;
  private rafId?: number;
  public totalDuration: Seconds = 0;
  public isPlaying = false;

  constructor(private config: MidiPlayerConfig) {
    super();
    this.config = { ...defaultConfig, ...config };
    this.updateConfig(this.config); // ✅ 初始化构建 synth 和 part
  }

  private prepareEvents(notes: SerializedNote[]) {
    const eventMap = new Map<number, SerializedNote[]>();
    notes.forEach(n => {
      if (n.disabled) return; // ✅ 跳过禁用音符
      if (!eventMap.has(n.time)) eventMap.set(n.time, []);
      eventMap.get(n.time)!.push(n);
    });

    const events = Array.from(eventMap.entries()).map(([time, notes]) => ({
      time: time,
      notes,
      duration: Math.max(...notes.map(n => n.duration)),
      velocity: Math.max(...notes.map(n => n._note?.velocity || 1), 0.1)
    })).sort((a, b) => a.time - b.time);

    const last = events.at(-1);
    this.totalDuration = last ? last.time + last.duration : 0;

    return events;
  }



  private lastRenderTime = 0;
  private frameInterval = 1000 / 60;
  private fpsLastTime = performance.now();

  private showfps(time: DOMHighResTimeStamp) {
    const delta = time - this.fpsLastTime;
    const fps = 1000 / delta;
    console.log(`FPS: ${fps.toFixed(2)}`);
    this.fpsLastTime = time;
  }

  public setFPS(fps: number) {
    this.frameInterval = 1000 / fps;
  }

  private tickProgress = (time: DOMHighResTimeStamp) => {
    const delta = time - this.lastRenderTime;
    if (delta < this.frameInterval) {
      this.rafId = requestAnimationFrame(this.tickProgress);
      return;
    }

    this.lastRenderTime = time;
    // this.showfps(time);
    // 固定时间步长逻辑（不依赖实际 delta）
    const current = this.getCurrentTime();
    const progress = this.getProgress();
    this.emit('progress', progress, current);

    if (current >= this.totalDuration) {
      this.reset();
      this.emit('finish');
      return;
    }

    this.rafId = requestAnimationFrame(this.tickProgress);
  };

  async toggle() {
    if (this.isPlaying) {
      this.pause();
    } else {
      await this.play();
    }
    return this.isPlaying;
  }

  async play() {
    await Tone.start();
    Tone.Transport.start();
    this.isPlaying = true;
    this.emit('toggle', true);
    this.tickProgress(performance.now());
  }

  pause() {
    Tone.Transport.pause();
    this.isPlaying = false;
    this.emit('toggle', false);
    if (this.rafId) cancelAnimationFrame(this.rafId);
  }

  playNote(midi: number, duration: Seconds = 250, velocity: number = 0.8): void {
    const note = Tone.Frequency(midi + this.config.transpose, 'midi').toNote();
    this.synth.triggerAttackRelease(note, duration, undefined, velocity);
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

  setProgress(percent: number) {
    if (this.totalDuration <= 0) return;

    const clamped = Math.max(0, Math.min(1, percent));
    const time = clamped * this.totalDuration;
    this.seek(time); // 内部已经 emit progress
  }

  updateConfig(config: Partial<MidiPlayerConfig>) {
    const shouldResetPart =
      !!config.notes ||
      (typeof config.transpose === 'number' && config.transpose !== this.config.transpose);

    this.config = { ...this.config, ...config };
    this._applySynthConfig(this.config);
    if (shouldResetPart) {
      this._applyPartConfig(this.config);
    }
  }

  private _applySynthConfig(config: MidiPlayerConfig) {
    const SynthClass = {
      fmsynth: Tone.FMSynth,
      amsynth: Tone.AMSynth
    }[config.synthType];

    if (!this.synth || config.synthType !== this.config.synthType) {
      this.synth?.dispose();
      this.synth = new Tone.PolySynth(SynthClass as any).toDestination();
    }

    this.synth.set({
      // @ts-expect-error 会报错，但实际有效
      harmonicity: config.params.harmonicity,
      modulationIndex: config.params.modulationIndex,
      envelope: {
        attack: config.params.attack,
        decay: config.params.decay,
        sustain: 0,
        release: config.params.release
      }
    });

    this.synth.volume.value = config.volume;
  }

  private _applyPartConfig(config: MidiPlayerConfig) {
    this.pause();
    this.seek(0);
    this.part?.dispose();

    const events = this.prepareEvents(config.notes ?? []);
    this.part = new Tone.Part((time, ev) => {
      if (!ev.notes?.length) return;
      const notes = ev.notes.map(n =>
        Tone.Frequency(n.midi + config.transpose, 'midi').toNote()
      );
      this.synth.triggerAttackRelease(notes, ev.duration, time, ev.velocity);
    }, events).start(0);

    this.part.loop = false;
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

  static sharedInstance: MidiPlayer | null = null;
  static get(): MidiPlayer {
    if (!MidiPlayer.sharedInstance) {
      if (typeof window === 'undefined') {
        throw new Error('MidiPlayer can only be used in the browser');
      }
      MidiPlayer.sharedInstance = new MidiPlayer(defaultConfig);
    }
    return MidiPlayer.sharedInstance;
  }
}
