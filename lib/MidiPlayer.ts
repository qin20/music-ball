import * as Tone from 'tone';
import audioBufferToWav from "audiobuffer-to-wav";
import { withEventEmitter } from './EventEmmiter';

export type SynthType = 'fmsynth' | 'amsynth';
export interface MidiSynthParams {
  harmonicity: number;
  modulationIndex: number;
  attack: number;
  sustain: number;
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
  volume: 1,
  transpose: 12,
  params: {
    harmonicity: 10,
    modulationIndex: 1,
    attack: 0.01,
    sustain: 0.2,
    decay: 1,
    release: 0.3,
  }
};

export class MidiPlayer extends withEventEmitter<MidiPlayerConfigEvents>() {
  synth!: Tone.PolySynth;
  part?: Tone.Part;
  rafId?: number;
  public totalDuration: Seconds = 0;
  public isPlaying = false;

  constructor(public config: MidiPlayerConfig) {
    super();
    this.config = { ...defaultConfig, ...config };
    this.synth = this.createSynth(this.config);
    this.part = this.createPart(this.synth, this.config);
    this.updateConfig(this.config); // ✅ 初始化构建 synth 和 part
  }

  lastRenderTime = 0;
  frameInterval = 1000 / 60;
  fpsLastTime = performance.now();

  showfps(time: DOMHighResTimeStamp) {
    const delta = time - this.fpsLastTime;
    const fps = 1000 / delta;
    console.log(`FPS: ${fps.toFixed(2)}`);
    this.fpsLastTime = time;
  }

  public setFPS(fps: number) {
    this.frameInterval = 1000 / fps;
  }

  tickProgress = (time: DOMHighResTimeStamp) => {
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

  playNote(midi: number, duration: Seconds = 0.2, velocity: number = 0.8): void {
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
    const { synthType, transpose, notes } = this.config;
    const conf = { ...this.config, ...config };
    const shouldReCreate = conf.synthType !== synthType
                      || (conf.transpose !== transpose)
                      || (conf.notes != notes)
    if (shouldReCreate) {
      this.pause();
      this.seek(0);

      this.synth?.dispose();
      this.synth = this.createSynth(conf);
      this.updateSynth(this.synth, conf);

      this.part?.dispose();
      this.part = this.createPart(this.synth, conf);
    } else {
      this.updateSynth(this.synth, conf);
    }

    this.config = conf;
  }

  createImpactSynth(): Tone.PolySynth {
    const reverb = new Tone.Reverb({
      decay: 2.5,       // 混响尾部
      preDelay: 0.01,   // 撞击反射略滞后
      wet: 0.5          // 混响比例
    }).toDestination();

    const synth = new Tone.PolySynth(Tone.AMSynth, {
      volume: -8,
      maxPolyphony: 10,
      options: {
        harmonicity: 3,
        modulationIndex: 1,
        oscillator: { type: 'square' },
        envelope: {
          attack: 0.001,   // 瞬间响起
          decay: 0.3,      // 撞击后的快速衰减
          sustain: 0.1,    // 轻微持续
          release: 2.0     // 缓慢消失
        },
        modulation: { type: 'sine' },
        modulationEnvelope: {
          attack: 0.001,
          decay: 0.2,
          sustain: 0.1,
          release: 0.5
        }
      }
    }).connect(reverb);

    return synth;
  }

  createImpactSynthHybrid() {
    const reverb = new Tone.Reverb({
      decay: 2.5,
      preDelay: 0.01,
      wet: 0.4
    }).toDestination();

    // 叮 - 清脆金属感
    const amSynth = new Tone.AMSynth({
      harmonicity: 2.5,
      modulationIndex: 1.5,
      oscillator: { type: 'triangle' },
      envelope: {
        attack: 0.001,
        decay: 0.3,
        sustain: 0.1,
        release: 2.0
      },
      modulationEnvelope: {
        attack: 0.001,
        decay: 0.2,
        sustain: 0.1,
        release: 0.5
      }
    }).connect(reverb);

    // 嘭 - 鼓膜低频感
    const membrane = new Tone.MembraneSynth({
      pitchDecay: 0.01,
      octaves: 6,
      oscillator: { type: 'sine' },
      envelope: {
        attack: 0.001,
        decay: 0.4,
        sustain: 0,
        release: 1.2
      }
    }).connect(reverb);

    return {
      trigger(note: string | number, time = Tone.now(), velocity = 1) {
        amSynth.triggerAttackRelease(note, '1n', time, velocity);
        membrane.triggerAttackRelease(note, '1n', time, velocity);
      }
    };
  }

  createSynth(config: MidiPlayerConfig) {
    const SynthClass = {
      fmsynth: Tone.FMSynth,
      amsynth: Tone.AMSynth
    }[config.synthType];
    return new Tone.PolySynth(SynthClass as any).toDestination();
  }

  updateSynth(synth: Tone.PolySynth, config: MidiPlayerConfig) {
    synth.set({
      // @ts-expect-error 会报错，但实际有效
      harmonicity: config.params.harmonicity,
      modulationIndex: config.params.modulationIndex,
      envelope: {
        attack: config.params.attack,
        decay: config.params.decay,
        sustain: config.params.sustain,
        release: config.params.release
      }
    });
    synth.volume.value = config.volume;
  }

  createPart(synth: Tone.PolySynth, config: MidiPlayerConfig) {
    const events = this.prepareEvents(config.notes ?? []);
    const part = new Tone.Part((time, ev) => {
      if (!ev.notes?.length) return;

      const threshold = 60;
      const transposed = ev.notes.map(n => ({
        ...n,
        effectiveMidi: n.midi + config.transpose
      }));

      let filtered = transposed.filter(n => n.effectiveMidi >= threshold);

      // 如果全部被过滤掉，则保留最高音
      if (filtered.length === 0) {
        const maxNote = transposed.reduce((a, b) =>
          a.effectiveMidi > b.effectiveMidi ? a : b
        );
        filtered = [maxNote];
      }

      const notes = filtered.map(n =>
        Tone.Frequency(n.effectiveMidi, 'midi').toNote()
      );

      synth.triggerAttackRelease(notes, ev.duration, time, ev.velocity);
    }, events).start(0);

    part.loop = false;
    return part;
  }

  prepareEvents(notes: SerializedNote[], tolerance: number = 0.05) {
    const constantDuration = 0.3;
    const constantVelocity = 1;

    // 排序所有 note
    const sortedNotes = notes
      .filter(n => !n.disabled)
      .sort((a, b) => a.time - b.time);

    const events: {
      time: number;
      notes: SerializedNote[];
      duration: number;
      velocity: number;
    }[] = [];

    for (const note of sortedNotes) {
      const lastEvent = events.at(-1);
      if (
        lastEvent &&
        Math.abs(note.time - lastEvent.time) <= tolerance
      ) {
        // 合并到最后一个事件
        lastEvent.notes.push(note);
      } else {
        // 新建事件
        events.push({
          time: note.time,
          notes: [note],
          duration: constantDuration,
          velocity: constantVelocity,
        });
      }
    }

    // 计算总时长
    const last = events.at(-1);
    this.totalDuration = last ? last.time + last.duration : 0;

    return events;
  }


  async getBuffer(): Promise<AudioBuffer> {
    const events = this.prepareEvents(this.config.notes ?? []);
    if (!events.length) throw new Error("No notes to export");

    const duration = events.at(-1)!.time + 1.5; // 留出 release 时间
    const buffer = await Tone.Offline(({ transport }) => {
      const synth = this.createSynth(this.config);
      this.updateSynth(synth, this.config);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const part = this.createPart(synth, this.config).start(0);
      transport.start();
    }, duration);

    return buffer.get()!;
  }

  async exportWav(): Promise<Blob> {
    const buffer = await this.getBuffer();
    const wavData = audioBufferToWav(buffer);
    const blob = new Blob([wavData], { type: "audio/wav" });
    return blob;
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
