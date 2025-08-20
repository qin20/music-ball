import JSZip from 'jszip';
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
import { CameraModes } from './Camera';

export interface RhythmExporterResult { ext: string; blob: Blob; }

export interface RhythmExporterOptions {
  fps: number;
  quality: Quality;
  aspectRatio: [number, number];
  aspectRatioHeight: number;
  onProgress?: (progress: number) => void;
}

export class RhythmExporter {
  private rhythm: Rhythm;
  private options: Required<RhythmExporterOptions>;
  private msPerFrame: number;
  private totalFrames: number;
  private offscreenCanvas!: HTMLCanvasElement;
  private _offscreenRhythm?: Rhythm;
  private width: number = 0;
  private height: number = 0;

  constructor(rhythm: Rhythm, options: RhythmExporterOptions) {
    const width = options.aspectRatio[0] / options.aspectRatio[1] * options.aspectRatioHeight;
    const height = options.aspectRatioHeight;
    const offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = width;
    offscreenCanvas.height = height;

    const duration = (rhythm.data.segments.at(-1)?.endTime || 0) + 2;
    const fps = options.fps ?? 60;

    this.options = {
      ...options,
      onProgress: options.onProgress ?? (() => {}),
    };

    this.msPerFrame = 1000 / fps;
    this.totalFrames = Math.ceil(duration * fps) + 1;
    this.rhythm = rhythm;
    this.offscreenCanvas = offscreenCanvas;
    this.width = width;
    this.height = height;

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
    offscreen.camera.setMode(CameraModes.FOLLOW);
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
      if (typeof document !== 'undefined' && document.hidden) {
        setTimeout(fn, 20); // 后台时保证任务继续执行
      } else if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(fn, { timeout: 100 });
      } else {
        setTimeout(fn, 10); // 默认降级处理
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

  public async exportFrames(): Promise<RhythmExporterResult> {
    const zip = new JSZip();

    await this.processRenderedFrames(async (canvas, i) => {
      const blob = await new Promise<Blob>((resolve) =>
        canvas.toBlob((b) => resolve(b!), 'image/webp', 1.0)
      );
      const arrayBuffer = await blob.arrayBuffer();
      zip.file(`frame_${String(i).padStart(4, '0')}.webp`, arrayBuffer);
    });

    const blob = await zip.generateAsync({ type: 'blob' });
    const ext = 'zip';

    return { ext, blob };
  }

  public async export(): Promise<RhythmExporterResult> {
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
    return {
      blob: new Blob([buffer], { type: 'video/mp4' }),
      ext: 'mp4',
    }
  }

  public dispose(): void {
    this._offscreenRhythm = undefined;
  }
}
