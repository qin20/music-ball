function easeOutCubic(t) {
  return t;
  return 1 - Math.pow(1 - t, 3);
}

export function createConfettiEffect({
  wall,
  hitTime,
  dx,
  dy,
  direction, // 'V' or 'H'
  particleCount = 10,
  duration = 300 // ms
}) {
  const baseAngle = direction === 'V'
    ? (dx > 0 ? 0 : Math.PI)
    : (dy > 0 ? Math.PI / 2 : -Math.PI / 2);

  const spread = Math.PI / 3;
  const shapes = ['square', 'triangle', 'line'];

  const seeds = Array.from({ length: particleCount }, (_, i) => {
    const angle = baseAngle + (Math.random() - 0.5) * spread;
    const speed = (1 + Math.random()) * 0.08;

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
      size: 2 + Math.random() * 2,
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

    setCurrentTime(ms) {
      const elapsed = ms - hitTime;
      const tNorm = elapsed / duration;
      const ease = easeOutCubic(tNorm); // 0 → 1
      const ratio = 1 - tNorm;

      for (const p of seeds) {
        p.life = ratio;
        p.scale = 1 - ease; // ✅ 直接缩小
        p.x = p.x0 + p.vx * ease * duration;
        p.y = p.y0 + p.vy * ease * duration;
        p.angle = p.angle0 + p.angularVelocity * elapsed;
      }
    },

    draw(ctx) {
      for (const p of seeds) {
        if (p.life >= 1 || p.scale <= 0.01) continue; // ✅ 不提前画、不画极小粒子

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.scale(p.scale, p.scale);
        // ctx.rotate(p.angle); // 如需旋转可启用
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


    isDone(ms) {
      return ms - hitTime > duration;
    }
  };
}
