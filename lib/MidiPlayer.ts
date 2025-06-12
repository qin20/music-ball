import { MidiPlayerInstance, MidiPlayerConfig, MidiSynthParams, MidiPlayerConfigEvents  } from './MidiPlayerInstance';

type ListenerMap = {
  [K in keyof MidiPlayerConfigEvents]?: MidiPlayerConfigEvents[K][];
};
export class MidiPlayer {
  private static instance: MidiPlayerInstance | null = null;
  private static config: MidiPlayerConfig | null = null;

  // 保存全局监听器（在每次 init 时重新绑定）
  private static globalListeners: ListenerMap = {};

  static init(config: MidiPlayerConfig) {
    if (this.instance) this.instance.dispose();
    this.config = { ...config };
    this.instance = new MidiPlayerInstance(this.config);

    // 重新绑定监听器
    (Object.keys(this.globalListeners) as (keyof MidiPlayerConfigEvents)[]).forEach(event => {
      const listeners = this.globalListeners[event];
      listeners?.forEach(callback => {
        this.instance?.on(event, callback);
      });
    });
  }

  /** 注册事件监听器 */
  static on<K extends keyof MidiPlayerConfigEvents>(
    event: K,
    callback: MidiPlayerConfigEvents[K]
  ) {
    if (!this.globalListeners[event]) {
      this.globalListeners[event] = [];
    }
    this.globalListeners[event]!.push(callback);
    this.instance?.on(event, callback);
  }

  /** 移除事件监听器 */
  static off<K extends keyof MidiPlayerConfigEvents>(
    event: K,
    callback: MidiPlayerConfigEvents[K]
  ): void {
    const listeners = this.globalListeners[event] as MidiPlayerConfigEvents[K][] | undefined;
    if (!listeners) return;

    this.globalListeners[event] = listeners.filter(cb => cb !== callback) as any;
    this.instance?.off(event, callback);
  }

  static async play() {
    await this.instance?.play();
  }

  static async playNote(...args: Parameters<MidiPlayerInstance['playNote']>) {
    this.instance?.playNote(...args);
  }

  static pause() {
    this.instance?.pause();
  }

  static reset() {
    this.instance?.reset();
  }

  static seek(seconds: Seconds) {
    this.instance?.seek(seconds);
  }

  static getCurrentTime(): Seconds {
    return this.instance?.getCurrentTime() ?? 0;
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
