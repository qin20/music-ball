import { MidiPlayer } from '../MidiPlayer';
import { Rhythm } from './Rhythm';
import {
  Output,
  BufferTarget,
  CanvasSource,
  Quality,
  AudioBufferSource,
  QUALITY_HIGH,
  Mp4OutputFormat,
} from 'mediabunny';

export interface RhythmExporterOptions {
  fps: number;
  quality: Quality;
  width: number;
  height: number;
  onProgress?: (progress: number) => void;
}

export class RhythmExporter {
  private rhythm: Rhythm;
  private options: Required<RhythmExporterOptions>;
  private msPerFrame: number;
  private totalFrames: number;
  private offscreenCanvas!: HTMLCanvasElement;
  private _offscreenRhythm?: Rhythm;

  constructor(rhythm: Rhythm, options: RhythmExporterOptions) {
    this.rhythm = rhythm;

    const offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = options.width;
    offscreenCanvas.height = options.height;
    this.offscreenCanvas = offscreenCanvas;

    const duration = (rhythm.data.segments.at(-1)?.endTime || 0) + 2;
    const fps = options.fps ?? 60;

    this.options = {
      ...options,
      onProgress: options.onProgress ?? (() => {}),
    };

    this.msPerFrame = 1000 / fps;
    this.totalFrames = Math.ceil(duration * fps) + 1;

    console.log(`正在导出，duration: ${duration}s, fps: ${fps}, frames: ${this.totalFrames}`)
  }

  private async createOffscreenRhythm(): Promise<Rhythm> {
    // 拷贝direction，保证导出的动画一致
    const notesWithDirection = this.rhythm.notes.map((n, i) => {
      const direction = this.rhythm.data.walls[i].direction;
      return { ...n, direction };
    });
    const offscreen = new Rhythm(this.offscreenCanvas, notesWithDirection, {
      ...this.rhythm.options,
      initBallDirection: this.rhythm.data.initBallDirection,
    });
    if (this.rhythm.walls.bgPattern) {
      offscreen.setBgPattern(this.rhythm.walls.bgPattern);
    }
    if (this.rhythm.walls.wallPattern) {
      offscreen.setBgPattern(this.rhythm.walls.wallPattern);
    }
    await offscreen.refresh();
    return offscreen;
  }

  private async renderFrame(index: number): Promise<HTMLCanvasElement> {
    if (!this._offscreenRhythm) {
      this._offscreenRhythm = await this.createOffscreenRhythm();
    }

    const rhythm = this._offscreenRhythm;
    const currentTime = index * this.msPerFrame;
    rhythm.seekTo(currentTime / 1000);
    rhythm.render();

    return rhythm.canvas;
  }

  private async processRenderedFrames(
    callback?: (canvas: HTMLCanvasElement, index: number) => Promise<void>
  ): Promise<void> {
    const { onProgress } = this.options;
    let i = 0;

    // 封装调度逻辑：使用 requestIdleCallback，如果没有就用 setTimeout
    const schedule = (fn: () => void) => {
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(fn, { timeout: 100 }); // 防止低优先级任务一直被饿死
      } else {
        setTimeout(fn, 10); // 降级处理，10ms 节流
      }
    };

    return new Promise<void>((resolve) => {
      const processNext = async () => {
        const canvas = await this.renderFrame(i);
        await callback?.(canvas, i);
        onProgress(i / this.totalFrames);
        i++;

        if (i < this.totalFrames) {
          schedule(processNext);
        } else {
          onProgress(1);
          resolve();
        }
      };

      schedule(processNext); // 启动处理
    });
  }

  public async export(): Promise<Blob> {
    const { fps, quality } = this.options;

    // 创建输出容器（WebM格式，写入内存）
    const output = new Output({
      format: new Mp4OutputFormat(),
      target: new BufferTarget(),
    });

    // 创建视频源绑定到 canvas，配置编码参数
    const videoSource = new CanvasSource(this.offscreenCanvas, {
      codec: 'avc',
      bitrate: quality,
    });
    output.addVideoTrack(videoSource);


    const audioSource = new AudioBufferSource({
      codec: 'aac',
      bitrate: QUALITY_HIGH,
    });
    output.addAudioTrack(audioSource);


    await output.start();

    // 利用你已有的帧渲染逻辑，逐帧渲染并绘制到 canvas
    await this.processRenderedFrames(async (frameCanvas, i) => {
      videoSource.add(i / fps, 1 / fps);
    });

    const audioBuffer = await MidiPlayer.get().getBuffer();
    await audioSource.add(audioBuffer);

    await output.finalize();

    const buffer = output.target.buffer;
    if (!buffer) throw new Error('Export failed: buffer is null');
    return new Blob([buffer], { type: 'video/mp4' });
  }

  public dispose(): void {
    this._offscreenRhythm = undefined;
  }
}
