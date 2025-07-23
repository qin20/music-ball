// 🎼 Rhythm.ts - 节奏可视化核心控制器（TypeScript版）

import { Camera } from './Camera';
import { RhythmWalls } from './RhythmWalls';
import { RhythmBall } from './RhythmBall';
import { CanvasResizer } from './CanvasResizer';
import { RhythmPathPlannerWorker } from '@/lib/workers/planner/RhythmPathPlannerWorker';
import type { RhythmPathPlanData } from './RhythmPathPlanner';

export interface RhythmOptions {
  characterSize: number;
  speed: number;
  wallColor: string;
  wallThickness: number;
  wallLength: number;
  minDistance: number;
  pathWidth: number;
  background: string;
  characterSkin: any;
}

export class Rhythm {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private center: { x: number; y: number };
  private notes: SerializedNote[];

  private walls: RhythmWalls;
  private ball!: RhythmBall;

  public options: RhythmOptions;
  public data!: RhythmPathPlanData;
  public camera: Camera;
  public resizer: CanvasResizer;

  constructor(canvas: HTMLCanvasElement, notes: SerializedNote[], options: RhythmOptions) {
    this.notes = notes;
    this.options = options;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.center = { x: canvas.width / 2, y: canvas.height / 2 };

    this.walls = new RhythmWalls({
      characterSize: this.options.characterSize,
      wallThickness: this.options.characterSize / 4,
      wallLength: this.options.characterSize,
      wallColor: this.options.wallColor, // 可配置化
      background: this.options.background,
    });

    this.ball = new RhythmBall(options.characterSkin ?? null);

    this.camera = new Camera(this.canvas, {
      safeMarginX: this.canvas.width * 0.15,
      safeMarginY: this.canvas.height * 0.15,
    });

    this.resizer = new CanvasResizer(this.canvas);
  }

  setResolution(mode: string) {
    this.resizer.enableAutoResize({
      mode: mode === '9:16' ? [9, 16] : [16, 9],
      getContainerSize: () => ({
        width: this.canvas?.parentElement?.offsetWidth || 0,
        height: this.canvas?.parentElement?.offsetHeight || 0,
      }),
      onResize: (cw: number, ch: number) => {
        this.camera.setMargin(cw * 0.15, ch * 0.15);
      }
    });
  }

  async refresh(): Promise<void> {
    const worker = new RhythmPathPlannerWorker();
    const data = await worker.generateAsync({
      startPos: this.center,
      notes: this.notes,
      random: false,
      ...this.options,
    });
    worker.dispose();
    this.data = data;

    console.log('轨迹生成结果：', this.data);

    this.walls.setData(this.data);
    this.ball.setData(this.data);
    this.camera.setData(this.data.paths);
    this.camera.update(this.ball.getPosition());
  }

  seekTo(seconds: Seconds): boolean {
    this.ball.seekTo(seconds);
    this.walls.seekTo(seconds);
    this.camera.update(this.ball.getPosition());

    this.ball.addTrail();
    this.ball.updateTrail();
    // this.ball.updateSpriteFrame?.(16);

    this.render();

    const lastEnd = this.data.segments.at(-1)?.endTime ?? 0;
    return seconds < lastEnd;
  }

  setWallPattern(pattern: CanvasPattern) {
    this.walls.setWallPattern(pattern);
    this.render();
  }

  setBgPattern(pattern: CanvasPattern) {
    this.walls.setBgPattern(pattern);
    this.render();
  }

  render(): void {
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.fillStyle = this.options.wallColor;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const { scale, offsetX, offsetY } = this.camera.getTransform();
    ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);

    this.walls.drawWallMask(ctx, this.camera);
    this.walls.draw(ctx);
    this.ball.drawTrail(ctx);
    this.ball.draw(ctx, this.options.characterSize);

    this.camera.drawSafeMargin(ctx);
  }
}
