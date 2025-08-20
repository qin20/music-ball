export type ConfettiShape = 'square' | 'triangle' | 'line';
export type ConfettiDirection = 'H' | 'V';

export interface ConfettiSeed {
  x0: number;
  y0: number;
  vx: number;
  vy: number;
  size: number;
  shape: ConfettiShape;
  angle0: number;
  angularVelocity: number;
  color: string;
  life: number;
  x: number;
  y: number;
  angle: number;
  scale: number;
}

export interface ConfettiEffect {
  type: 'confetti';
  startTime: number;
  seeds: ConfettiSeed[];
  seekTo: (seconds: Seconds) => void;
  draw: (ctx: CanvasRenderingContext2D) => void;
  isDone: (seconds: Seconds) => boolean;
}

export interface ConfettiEffectOptions {
  wall: {
    start: { x: number; y: number };
    end: { x: number; y: number };
  };
  hitTime: number;
  dx: number;
  dy: number;
  direction: ConfettiDirection;
  particleCount?: number;
  size?: number;
  duration?: number;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function createConfettiEffect({
  wall,
  hitTime,
  dx,
  dy,
  direction,
  particleCount = 10,
  size = 4,
  duration = 1
}: ConfettiEffectOptions): ConfettiEffect {
  const baseAngle =
    direction === 'V'
      ? dx > 0
        ? 0
        : Math.PI
      : dy > 0
      ? Math.PI / 2
      : -Math.PI / 2;

  const spread = Math.PI / 3;
  const shapes: ConfettiShape[] = ['square', 'triangle', 'line'];

  const seeds: ConfettiSeed[] = Array.from({ length: particleCount }, (_, i) => {
    const angle = baseAngle + (Math.random() - 0.5) * spread;
    const speed = (1 + Math.random()) * size * 15;

    const t = particleCount === 1 ? 0.5 : i / (particleCount - 1);
    const originX = wall.start.x * (1 - t) + wall.end.x * t;
    const originY = wall.start.y * (1 - t) + wall.end.y * t;

    const angle0 = Math.random() * Math.PI;
    const angularVelocity = (Math.random() - 0.5) * 0.2;

    return {
      x0: originX,
      y0: originY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: size + Math.random() * size,
      shape: shapes[Math.floor(Math.random() * shapes.length)],
      angle0,
      angularVelocity,
      color: `hsl(${Math.floor(Math.random() * 360)}, 100%, 65%)`,
      life: 1,
      x: originX,
      y: originY,
      angle: angle0,
      scale: 1
    };
  });

  return {
    type: 'confetti',
    startTime: hitTime,
    seeds,

    seekTo(seconds: Seconds) {
      const elapsed = Math.max(0, Math.min(seconds - hitTime, duration));
      const tNorm = elapsed / duration;
      const ease = easeOutCubic(tNorm);
      const ratio = 1 - tNorm;

      for (const p of seeds) {
        p.life = ratio;
        p.scale = 1 - ease;
        p.x = p.x0 + p.vx * ease * duration;
        p.y = p.y0 + p.vy * ease * duration;
        p.angle = p.angle0 + p.angularVelocity * elapsed;
      }
    },

    draw(ctx: CanvasRenderingContext2D) {
      for (const p of seeds) {
        if (p.life >= 1 || p.scale <= 0.01) continue;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.scale(p.scale, p.scale);
        // ctx.rotate(p.angle); // 可启用旋转
        ctx.fillStyle = p.color;

        switch (p.shape) {
          case 'square':
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
            break;
          case 'triangle':
            ctx.beginPath();
            ctx.moveTo(0, -p.size);
            ctx.lineTo(p.size, p.size);
            ctx.lineTo(-p.size, p.size);
            ctx.closePath();
            ctx.fill();
            break;
          case 'line':
            ctx.fillRect(-p.size / 2, 0, p.size, 1);
            break;
        }

        ctx.restore();
      }
    },

    isDone(seconds: Seconds): boolean {
      return seconds - hitTime > duration;
    }
  };
}
