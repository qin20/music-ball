// 🎱 RhythmBall.ts - 节奏小球（支持动画皮肤、拖尾、攻击状态）

import { RhythmPathPlanData } from "./RhythmPathPlanner";

export interface Vec2 {
  x: number;
  y: number;
}

export interface Segment {
  startTime: number;
  endTime: number;
  startPos: Vec2;
  endPos: Vec2;
}

export interface TrailParticle {
  x: number;
  y: number;
  life: number;
}

export interface FrameRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface CharacterSkin {
  sprite: HTMLImageElement;
  frames: Record<string, FrameRect[]>;
  anchor?: 'center' | 'center-bottom';
  behavior?: {
    defaultState?: string;
    hitAutoReturn?: boolean;
    durationMap?: Record<string, number>;
    attackMap?: Record<string, string>;
    impactFrames?: Record<string, number>;
    moveMap?: Record<string, string>;
    frameInterval?: number;
  };
}

export class RhythmBall {
  private segments: Segment[] = [];
  private skin: CharacterSkin | null;

  private index = 0;
  private t = 0;
  private x = 0;
  private y = 0;
  private _lastTriggeredIndex = -1;

  private trailParticles: TrailParticle[] = [];

  // Skin-related
  private sprite?: HTMLImageElement;
  private frames?: Record<string, FrameRect[]>;
  private behavior?: CharacterSkin['behavior'];
  private state = 'idle';
  private frameIndex = 0;
  private frameTimer = 0;
  private autoReturnTimer = 0;
  private frameInterval = 100;
  private attackMap?: Record<string, string>;

  constructor(characterSkin: CharacterSkin | null = null) {
    this.skin = characterSkin;
    if (this.skin && this.skin.sprite && this.skin.frames) {
      this._initSkinState();
    }
  }

  private _initSkinState() {
    this.sprite = this.skin!.sprite;
    this.frames = this.skin!.frames;
    this.behavior = this.skin!.behavior || {};

    this.frameInterval = this.behavior.frameInterval || 100;
    this.attackMap = this.behavior.attackMap || {};
    this.state = this.behavior.defaultState || 'idle';
    this.frameIndex = 0;
    this.frameTimer = 0;
    this.autoReturnTimer = 0;
  }

  setData(planner: RhythmPathPlanData) {
    this.segments = planner.segments;
    this.x = this.segments[0]?.startPos.x || 0;
    this.y = this.segments[0]?.startPos.y || 0;
  }

  seekTo(seconds: Seconds) {
    const attackMap = this.attackMap || {};
    const moveMap = this.behavior?.moveMap || {};
    const impactFrames = this.behavior?.impactFrames || {};
    const frameInterval = this.frameInterval || 100;

    for (let i = 0; i < this.segments.length; i++) {
      const seg = this.segments[i];
      const { startTime, endTime } = seg;

      if (seconds >= startTime && seconds < endTime) {
        const t = (seconds - startTime) / (endTime - startTime);
        this.index = i;
        this.t = t;

        this.x = seg.startPos.x * (1 - t) + seg.endPos.x * t;
        this.y = seg.startPos.y * (1 - t) + seg.endPos.y * t;

        const dx = seg.endPos.x - seg.startPos.x;
        const dy = seg.endPos.y - seg.startPos.y;

        // attack trigger
        const dir = this._getDir(dx, dy);
        const attackState = attackMap[dir];
        const impactFrame = impactFrames[attackState] ?? 0;
        const leadTime = impactFrame * frameInterval;

        if (seconds >= endTime - leadTime) {
          if (attackState && this.state !== attackState) {
            this.setState(attackState, this.behavior?.hitAutoReturn !== false);
          }
        }

        // move direction
        const diagDir = this._getDiagonalDir(dx, dy);
        const moveState = moveMap[diagDir];
        if (moveState && this.state !== moveState && !this.state.startsWith('attack')) {
          this.setState(moveState);
        }

        return;
      }
    }

    // ✅ 超出所有段落：强制设定为最后状态
    const lastSeg = this.segments.at(-1);
    if (lastSeg && seconds >= lastSeg.endTime) {
      this.index = this.segments.length - 1;
      this.t = 1;
      this.x = lastSeg.endPos.x;
      this.y = lastSeg.endPos.y;

      const dx = lastSeg.endPos.x - lastSeg.startPos.x;
      const dy = lastSeg.endPos.y - lastSeg.startPos.y;
      const diagDir = this._getDiagonalDir(dx, dy);
      const moveState = moveMap[diagDir];
      if (moveState && !this.state?.startsWith('attack')) {
        this.setState(moveState);
      }
    }
  }

  private _getDir(dx: number, dy: number): 'left' | 'right' | 'up' | 'down' {
    return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
  }

  private _getDiagonalDir(dx: number, dy: number): string {
    const h = dx > 0 ? 'right' : 'left';
    const v = dy > 0 ? 'down' : 'up';
    return `${v}-${h}`; // like 'up-left'
  }

  setState(state: string, autoReturn = false) {
    if (!this.frames?.[state]) return;

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
        this.setState(this.behavior?.defaultState || 'idle');
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
    for (const p of this.trailParticles) {
      p.life -= 0.02;
    }
    this.trailParticles = this.trailParticles.filter(p => p.life > 0);
  }

  drawTrail(ctx: CanvasRenderingContext2D) {
    for (const p of this.trailParticles) {
      const radius = 6 * p.life;
      this._drawTrail(ctx, p, radius);
    }
  }

  _drawBall(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    r: number
  ) {
    ctx.save();
    ctx.beginPath();
    const xx = Math.round(this.x * 100) / 100;
    const yy = Math.round(this.y * 100) / 100;
    ctx.arc(xx, yy, r, 0, 2 * Math.PI);
    ctx.fillStyle = '#000';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 12;
    ctx.fill();
    ctx.restore();
  }

  _drawTrail(
    ctx: CanvasRenderingContext2D,
    p: { x: number; y: number; life: number },
    radius: number
  ) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${p.life})`;
    ctx.fill();
    ctx.restore();
  }

  draw(ctx: CanvasRenderingContext2D, characterSize: number) {
    if (!this.skin || !this.frames || !this.sprite || !this.frames[this.state]) {
      this._drawBall(ctx, this.x, this.y, characterSize / 2);
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

  getPosition(): Vec2 {
    return { x: this.x, y: this.y };
  }
}
