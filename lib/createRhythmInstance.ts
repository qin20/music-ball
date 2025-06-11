import { Rhythm } from '@/scripts/Rhythm';

interface CreateRhythmOptions {
  canvas: HTMLCanvasElement;
  events: MidiNote[];
  options?: ConstructorParameters<typeof Rhythm>[2];
  onHit?: (index: number) => void;
}

let instance: Rhythm | null = null;

export function createRhythmInstance({ canvas, events, options }: CreateRhythmOptions): Rhythm {
  if (!instance) {
    instance = new Rhythm(canvas, events, {
      ballStyle: (
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        r: number
      ) => {
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = '#000';
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 12;
        ctx.fill();
        ctx.restore();
      },

      drawTrail: (
        ctx: CanvasRenderingContext2D,
        p: { x: number; y: number; life: number },
        radius: number
      ) => {
        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${p.life})`;
        ctx.fill();
        ctx.restore();
      },
      wallColor: '#333',
      glowColor: '#fff',
      background: '#fff',
      ...options,
    });
  }

  return instance;
}

export function disposeRhythmInstance() {
  instance = null; // 或调用 instance.dispose()，看 Rhythm 是否支持
}
