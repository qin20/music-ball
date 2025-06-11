import { MidiPlayerInstance, MidiPlayerConfig, MidiSynthParams } from './MidiPlayerInstance';

export class MidiPlayer {
  private static instance: MidiPlayerInstance | null = null;
  private static config: MidiPlayerConfig | null = null;

  static init(config: MidiPlayerConfig) {
    if (this.instance) this.instance.dispose();
    this.config = { ...config };
    this.instance = new MidiPlayerInstance(this.config);
  }

  static async play() {
    this.instance?.play();
  }

  static pause() {
    this.instance?.pause();
  }

  static reset() {
    this.instance?.reset();
  }

  static seek(seconds: number) {
    this.instance?.seek(seconds);
  }

  static async toggle() {
    if (this.instance?.isPlaying) {
      this.instance.pause();
    } else {
      await this.instance?.play();
    }
    return this.instance?.isPlaying || false;
  }

  static isPlaying(): boolean {
    return this.instance?.isPlaying ?? false;
  }

  static getProgress(): number {
    return this.instance?.getProgress() ?? 0;
  }

  static getDuration(): number {
    return this.instance?.totalDuration ?? 0;
  }

  static async export(): Promise<Blob | null> {
    return this.instance?.exportToWebM() ?? null;
  }

  /** 更新参数（会重建实例） */
  static setParams(params: MidiSynthParams) {
    if (!this.config) return;
    this.init({ ...this.config, params });
  }

  static setVolume(volume: number) {
    if (!this.config) return;
    this.init({ ...this.config, volume });
  }

  static setTranspose(transpose: number) {
    if (!this.config) return;
    this.init({ ...this.config, transpose });
  }

  static setSynthType(synthType: MidiPlayerConfig['synthType']) {
    if (!this.config) return;
    this.init({ ...this.config, synthType });
  }

  static setNotes(notes: MidiPlayerConfig['notes']) {
    if (!this.config) return;
    this.init({ ...this.config, notes });
  }
}
