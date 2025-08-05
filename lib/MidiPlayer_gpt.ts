import * as Tone from "tone";

export interface MidiPlayerConfig {
  synthType: "fmsynth" | "amsynth";
  params: {
    harmonicity: number;
    modulationIndex: number;
    attack: number;
    decay: number;
    release: number;
  };
  volume: number;
  transpose: number;
  notes: MidiNoteEvent[];
}

export interface MidiNoteEvent {
  midi: number;
  duration: number;
  velocity: number;
  time: number;
}

export class MidiPlayer {
  private synth: Tone.PolySynth | null = null;
  private part: Tone.Part | null = null;
  private config: MidiPlayerConfig;

  constructor(config: MidiPlayerConfig) {
    this.config = config;
    this._applySynthConfig(config);
    this._applyPartConfig(config);
  }

  private createSynth(config: MidiPlayerConfig): Tone.PolySynth {
    const SynthClass = {
      fmsynth: Tone.FMSynth,
      amsynth: Tone.AMSynth
    }[config.synthType];

    const synth = new Tone.PolySynth(SynthClass as any).toDestination();
    synth.set({
      // @ts-expect-error Tone 类型系统不够灵活
      harmonicity: config.params.harmonicity,
      modulationIndex: config.params.modulationIndex,
      envelope: {
        attack: config.params.attack,
        decay: config.params.decay,
        sustain: 0,
        release: config.params.release
      },
      volume: config.volume
    });
    return synth;
  }

  private createPart(config: MidiPlayerConfig, synth: Tone.PolySynth): Tone.Part {
    const events = this.prepareEvents(config.notes ?? []);
    const part = new Tone.Part((time, ev) => {
      if (!ev.notes?.length) return;
      const notes = ev.notes.map(n =>
        Tone.Frequency(n.midi + config.transpose, "midi").toNote()
      );
      synth.triggerAttackRelease(notes, ev.duration, time, ev.velocity);
    }, events);

    part.loop = false;
    return part;
  }

  private prepareEvents(notes: MidiNoteEvent[]) {
    const eventMap = new Map<number, MidiNoteEvent[]>();

    for (const note of notes) {
      if (!eventMap.has(note.time)) eventMap.set(note.time, []);
      eventMap.get(note.time)!.push(note);
    }

    const events = Array.from(eventMap.entries()).map(([time, notes]) => ({
      time,
      notes,
      duration: 0.2, // 统一音效 duration
      velocity: 0.8   // 统一力度 velocity
    }));

    return events.sort((a, b) => a.time - b.time);
  }

  private _applySynthConfig(config: MidiPlayerConfig) {
    if (!this.synth || config.synthType !== this.config.synthType) {
      this.synth?.dispose();
      this.synth = this.createSynth(config);
    }
  }

  private _applyPartConfig(config: MidiPlayerConfig) {
    this.pause();
    this.seek(0);
    this.part?.dispose();

    this.part = this.createPart(config, this.synth!).start(0);
  }

  public async exportWav(): Promise<Blob> {
    const events = this.prepareEvents(this.config.notes ?? []);
    if (!events.length) throw new Error("No notes to export");

    const duration = events.at(-1)!.time + 1.5; // 留出 release 时间

    const buffer = await Tone.Offline(({ transport }) => {
      const synth = this.createSynth(this.config);
      const part = this.createPart(this.config, synth).start(0);
      transport.start();
    }, duration);

    const wav = await this.bufferToWavBlob(buffer);
    return wav;
  }

  private async bufferToWavBlob(buffer: Tone.ToneAudioBuffer): Promise<Blob> {
    const wavData = await Tone.ToneAudioBuffer.toWav(buffer);
    return new Blob([wavData], { type: "audio/wav" });
  }

  public play() {
    Tone.start();
    Tone.Transport.start();
  }

  public pause() {
    Tone.Transport.pause();
  }

  public stop() {
    Tone.Transport.stop();
  }

  public seek(time: number) {
    Tone.Transport.seconds = time;
  }

  public updateConfig(config: MidiPlayerConfig) {
    this.config = config;
    this._applySynthConfig(config);
    this._applyPartConfig(config);
  }
}
