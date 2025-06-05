export class RhythmBall {
  constructor(options, segments, characterSkin = null) {
    this.options = options;
    this.segments = segments;
    this.skin = characterSkin;

    this.index = 0;
    this.t = 0;
    this.x = segments[0].startPos.x;
    this.y = segments[0].startPos.y;
    this._lastTriggeredIndex = -1;

    this.trailParticles = [];

    if (this.skin && this.skin.sprite && this.skin.frames) {
      this._initSkinState();
    }
  }

  _initSkinState() {
    this.sprite = this.skin.sprite;
    this.frames = this.skin.frames;
    this.behavior = this.skin.behavior || {};

    this.frameInterval = this.behavior.frameInterval || 100;
    this.attackMap = this.behavior.attackMap || {};
    this.state = this.behavior.defaultState || 'idle';
    this.frameIndex = 0;
    this.frameTimer = 0;
    this.autoReturnTimer = 0;
  }

  setCurrentTime(ms) {
    const attackMap = this.attackMap || {};
    const moveMap = this.behavior?.moveMap || {};
    const impactFrames = this.behavior?.impactFrames || {};
    const frameInterval = this.frameInterval || 100;

    for (let i = 0; i < this.segments.length; i++) {
      const seg = this.segments[i];
      const t0 = seg.startTime;
      const t1 = seg.endTime;

      if (ms >= t0 && ms < t1) {
        const t = (ms - t0) / (t1 - t0);
        this.index = i;
        this.t = t;

        this.x = seg.startPos.x * (1 - t) + seg.endPos.x * t;
        this.y = seg.startPos.y * (1 - t) + seg.endPos.y * t;

        // 🧠 获取当前段落方向
        const dx = seg.endPos.x - seg.startPos.x;
        const dy = seg.endPos.y - seg.startPos.y;

        // ✅ 提前触发攻击动画（关键帧对准）
        const dir = this._getDir(dx, dy);
        const attackState = attackMap[dir];
        const impactFrame = impactFrames[attackState] ?? 0;
        const leadTime = impactFrame * frameInterval;
        const collisionTime = t1;

        if (ms >= collisionTime - leadTime) {
          if (attackState && this.state !== attackState) {
            this.setState(attackState, this.behavior?.hitAutoReturn !== false);
          }
        }

        // ✅ 设置方向性移动动作（排除攻击中）
        const diagDir = this._getDiagonalDir(dx, dy);
        const moveState = moveMap[diagDir];
        if (moveState && this.state !== moveState && !this.state.startsWith('attack')) {
          this.setState(moveState);
        }

        return;
      }
    }
  }


  _getDir(dx, dy) {
    if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left';
    return dy > 0 ? 'down' : 'up';
  }

  setState(state, autoReturn = false) {
    if (!this.frames[state]) return;

    if (this.state !== state) {
      this.state = state;
      this.frameIndex = 0;
      this.frameTimer = 0;

      const totalDuration = this.behavior?.durationMap?.[state] ?? 1000;
      const frameCount = this.frames[state].length;
      this.frameInterval = totalDuration / frameCount;

      if (autoReturn) {
        this.autoReturnTimer = totalDuration;
      }
    }
  }

  updateSpriteFrame(dt = 16) {
    if (!this.frames) return;

    this.frameTimer += dt;
    if (this.autoReturnTimer > 0) {
      this.autoReturnTimer -= dt;
      if (this.autoReturnTimer <= 0) {
        this.setState(this.behavior.defaultState || 'idle');
      }
    }

    const current = this.frames[this.state];
    if (!current || current.length <= 1) return;

    if (this.frameTimer >= this.frameInterval) {
      this.frameTimer = 0;
      this.frameIndex = (this.frameIndex + 1) % current.length;
    }
  }

  addTrail() {
    this.trailParticles.push({ x: this.x, y: this.y, life: 1.0 });
  }

  updateTrail() {
    for (const p of this.trailParticles) p.life -= 0.02;
    this.trailParticles = this.trailParticles.filter(p => p.life > 0);
  }

  drawTrail(ctx) {
    for (const p of this.trailParticles) {
      const radius = 6 * p.life;
      this.options.drawTrail(ctx, p, radius);
    }
  }

  draw(ctx, characterSize) {
    if (!this.skin || !this.frames || !this.sprite || !this.frames[this.state]) {
      this.options.ballStyle(ctx, this.x, this.y, characterSize / 2); // fallback 用半径
      return;
    }

    const frame = this.frames[this.state][this.frameIndex];
    const { x: fx, y: fy, w: fw, h: fh } = frame;

    const drawW = characterSize;
    const drawH = characterSize;

    let dx = this.x;
    let dy = this.y;
    const anchor = this.skin.anchor || 'center';

    if (anchor === 'center') {
      dx -= drawW / 2;
      dy -= drawH / 2;
    } else if (anchor === 'center-bottom') {
      dx -= drawW / 2;
      dy -= drawH;
    }

    ctx.save();
    ctx.drawImage(this.sprite, fx, fy, fw, fh, dx, dy, drawW, drawH);
    ctx.restore();
  }

  getPosition() {
    return { x: this.x, y: this.y };
  }

  _getDiagonalDir(dx, dy) {
    const h = dx > 0 ? 'right' : 'left';
    const v = dy > 0 ? 'down' : 'up';
    return `${v}-${h}`; // 例：'up-left'
  }
}
