// RhythmCharacter.js
export class RhythmCharacter {
  constructor(options) {
    this.options = options;
    this.state = 'idle';
    this.t = 0;
    this.pos = { x: 0, y: 0 };
    this.launchTarget = { x: 0, y: 0 };
  }

  update(dt) {
    this.t += dt;
    if (this.state === 'charging' && this.t >= 1200) {
      this.state = 'transforming';
      this.t = 0;
    } else if (this.state === 'transforming' && this.t >= 300) {
      this.state = 'launched';
      this.t = 0;
    }
  }

  draw(ctx) {
    this.options.draw(this, ctx);
  }

  isFinished() {
    return this.state === 'launched';
  }

  getBallPosition() {
    if (this.state === 'transforming' || this.state === 'launched') {
      const t = Math.min(this.t / 300, 1);
      return {
        x: this.pos.x * (1 - t) + this.launchTarget.x * t,
        y: this.pos.y * (1 - t) + this.launchTarget.y * t
      };
    }
    return this.pos;
  }

  startLaunch(targetPos) {
    this.state = 'charging';
    this.t = 0;
    this.launchTarget = { ...targetPos };
  }
}
