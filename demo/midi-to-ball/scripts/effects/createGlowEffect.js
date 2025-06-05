// 墙体碰撞后发光特效
export function createGlowEffect({
  wall,
  hitTime,
  hitColor = '#fff',
  wallThickness = 6,
}) {
  const glowIn = 0.15;

  return {
    type: 'glow',
    startTime: hitTime,
    level: 0,

    setCurrentTime(ms) {
      const t = (ms - hitTime) / 400;
      this.level = t < glowIn ? t / glowIn : 1;
    },

    draw(ctx) {
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
