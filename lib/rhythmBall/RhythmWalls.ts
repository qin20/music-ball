/**
 * ============================================================
 * 🧱 RhythmWalls.ts（节奏反射墙体与路径模块）
 * ============================================================
 *
 * 📌 模块简介
 * ------------------------------------------------------------
 * RhythmWalls 模块负责根据节奏事件（如 MIDI 音符）生成反射路径与墙体，
 * 通过 RhythmPathPlanner 栈式回溯算法确保路径不会穿越自身或其他墙体。
 *
 * 同时支持发光动画控制、路径遮罩（墙体挖空通道）绘制，以及调试辅助（轨迹线、节点）。
 * 本模块与 RhythmBall 可无缝联动，实现节奏可视化中的动态轨迹反射与撞墙反馈。
 *
 * 🔄 最后修改：由清缘与 ChatGPT 合作设计，2025-06
 * ============================================================
 */

import { createGlowEffect } from '@/lib/rhythmBall/effects/glow';
import { createConfettiEffect } from '@/lib/rhythmBall/effects/confetti';
import type { RhythmPathPlanData, Vec2, Wall as BaseWall } from './RhythmPathPlanner';

interface Wall extends BaseWall {
  effects: any[];
}

interface RhythmWallsOptions {
  characterSize: number;
  wallThickness: number;
  wallLength: number;
  wallColor: string;
  wallPattern?: CanvasPattern;
  background: string;
  debug?: boolean;
}

interface CameraLike {
  getTransform(): { scale: number; offsetX: number; offsetY: number };
}

export class RhythmWalls {
  private options: RhythmWallsOptions;
  private walls: Wall[] = [];
  private path: Vec2[] = [];
  private segments: Segment[] = [];
  public wallPattern?: CanvasPattern;
  public bgPattern?: CanvasPattern;

  constructor(options: RhythmWallsOptions) {
    this.options = {
      debug: false,
      ...options
    };
  }

  setData(data: RhythmPathPlanData) {
    const { wallThickness } = this.options;

    this.path = data.paths;
    this.segments = data.segments;
    this.walls = data.walls.map((wall, index) => {
      const seg = data.segments[index];
      const dx = seg.endPos.x > seg.startPos.x ? 1 : -1;
      const dy = seg.endPos.y > seg.startPos.y ? 1 : -1;
      const isVertical = wall.start.x === wall.end.x;
      const direction = isVertical ? 'V' : 'H';

      return {
        ...wall,
        effects: [
          createGlowEffect({
            wall,
            hitTime: seg.endTime,
            hitColor: wall.hitColor,
            wallThickness,
          }),
          createConfettiEffect({
            wall,
            hitTime: seg.endTime,
            dx,
            dy,
            direction,
            size: this.options.characterSize / 10,
          })
        ]
      };
    });
  }

  seekTo(currentTime: number) {
    for (const wall of this.walls) {
      for (const effect of wall.effects) {
        effect.seekTo(currentTime);
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    for (const wall of this.walls) {
      const { start, end, effects = [] } = wall;

      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const length = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);
      const thickness = this.options.wallThickness;

      ctx.save();
      ctx.translate(start.x, start.y);
      ctx.rotate(angle);
      ctx.fillStyle = this.wallPattern ?? this.options.wallColor;
      ctx.fillRect(0, -thickness / 2, length, thickness);
      ctx.restore();

      for (const effect of effects) {
        if (effect.draw) effect.draw(ctx);
      }
    }

    if (this.options.debug) {
      // this.drawDebug(ctx);
    }
  }

  drawDebug(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();

    if (this.path.length > 0) {
      ctx.moveTo(this.path[0].x, this.path[0].y);
      for (let i = 1; i < this.path.length; i++) {
        ctx.lineTo(this.path[i].x, this.path[i].y);
      }
    }

    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.fillStyle = '#ccc';
    const radius = this.options.characterSize / 2;

    for (const pt of this.path) {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawWallMask(ctx: CanvasRenderingContext2D, camera: CameraLike) {
    const padding = this.options.characterSize;
    ctx.save();

    const { wallColor, background } = this.options;
    const { scale, offsetX, offsetY } = camera.getTransform();
    const canvas = ctx.canvas;
    const x = -offsetX / scale;
    const y = -offsetY / scale;
    const width = canvas.width / scale;
    const height = canvas.height / scale;

    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = this.wallPattern || wallColor;
    ctx.fillRect(x, y, width, height);

    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = this.bgPattern || background;
    for (const seg of this.segments) {
      const { startPos, endPos } = seg;
      const x1 = Math.min(startPos.x, endPos.x);
      const x2 = Math.max(startPos.x, endPos.x);
      const y1 = Math.min(startPos.y, endPos.y);
      const y2 = Math.max(startPos.y, endPos.y);

      ctx.fillRect(
        x1 - padding / 2,
        y1 - padding / 2,
        (x2 - x1) + padding,
        (y2 - y1) + padding
      );
    }

    ctx.restore();
  }

  _computePathBounds(pad = 0) {
    const xs = this.path.map(p => p.x);
    const ys = this.path.map(p => p.y);

    const minX = Math.min(...xs) - pad;
    const maxX = Math.max(...xs) + pad;
    const minY = Math.min(...ys) - pad;
    const maxY = Math.max(...ys) + pad;

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  getPath() {
    return this.path;
  }

  getSegments() {
    return this.segments;
  }

  setWallPattern(pattern: CanvasPattern) {
    this.wallPattern = pattern;
  }

  setBgPattern(pattern: CanvasPattern) {
    this.bgPattern = pattern;
  }
}
