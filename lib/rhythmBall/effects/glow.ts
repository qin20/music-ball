export interface GlowWall {
  start: { x: number; y: number };
  end: { x: number; y: number };
}

export interface GlowEffectOptions {
  wall: GlowWall;
  hitTime: number;
  hitColor?: string;
  wallThickness?: number;
  duration?: number;
}

export interface GlowEffect {
  type: 'glow';
  startTime: number;
  level: number;
  seekTo: (seconds: Seconds) => void;
  draw: (ctx: CanvasRenderingContext2D) => void;
}

export function createGlowEffect({
  wall,
  hitTime,
  hitColor = '#fff',
  wallThickness = 6,
  duration = 0.3
}: GlowEffectOptions): GlowEffect {
  const glowIn = 0.15; // 前 15% 时间线性过渡光强

  return {
    type: 'glow',
    startTime: hitTime,
    level: 0,

    seekTo(seconds: Seconds) {
      const t = (seconds - hitTime) / duration;
      this.level = t < glowIn ? t / glowIn : 1;
    },

    draw(ctx: CanvasRenderingContext2D) {
      if (this.level <= 0) return;

      const dx = wall.end.x - wall.start.x;
      const dy = wall.end.y - wall.start.y;
      const len = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);

      ctx.save();
      ctx.translate(wall.start.x, wall.start.y);
      ctx.rotate(angle);

      ctx.shadowColor = hitColor;
      ctx.shadowBlur = 15 * this.level;
      ctx.fillStyle = hitColor;
      ctx.fillRect(0, -wallThickness / 2, len, wallThickness);

      ctx.restore();
    }
  };
}
