// 🎱 RhythmBall.ts - 节奏小球（支持动画皮肤、拖尾、攻击状态）

import { RhythmPathPlanData } from "./RhythmPathPlanner";

export interface Vec2 {
  x: number;
  y: number;
}

export interface TrailBall {
  x: number
  y: number
  haloColor: string
  appearTime: number  // 什么时候该点出现残影
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

// ===== 光晕颜色计算函数 =====
function getHaloColorByTime(currentTime: number): string {
  // ===== 可配置参数 =====
  const HUE_CYCLE_SECONDS = 6; // hue 色相变化周期（秒）
  const BASE_HUE = 90;          // hue 起始角度
  const hue = (BASE_HUE + (currentTime * (360 / HUE_CYCLE_SECONDS))) % 360;
  return `hsla(${hue}, 100%, 70%, 1)`;
}

export class RhythmBall {
  private segments: Segment[] = [];
  private skin: CharacterSkin | null;

  private size = 0;
  private x = 0;
  private y = 0;
  private currentTime: Seconds = 0;

  private trailBalls: TrailBall[] = [];

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

  constructor(size: number, characterSkin: CharacterSkin | null = null) {
    this.size = size;
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
    this.trailBalls = this.generateTrails();
  }

  generateTrails(density: number = 7): TrailBall[] {
    const trailBalls: TrailBall[] = []

    for (const seg of this.segments) {
      const dx = seg.endPos.x - seg.startPos.x
      const dy = seg.endPos.y - seg.startPos.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      const count = Math.floor(distance / density)

      for (let i = 0; i <= count; i++) {
        const t = i / count
        const x = seg.startPos.x + dx * t
        const y = seg.startPos.y + dy * t
        const appearTime = seg.startTime + t * (seg.endTime - seg.startTime)
        const haloColor = getHaloColorByTime(appearTime)

        trailBalls.push({ x, y, haloColor, appearTime })
      }
    }

    return trailBalls
  }

  seekTo(seconds: Seconds) {
    this.currentTime = seconds;

    const attackMap = this.attackMap || {};
    const moveMap = this.behavior?.moveMap || {};
    const impactFrames = this.behavior?.impactFrames || {};
    const frameInterval = this.frameInterval || 100;

    for (let i = 0; i < this.segments.length; i++) {
      const seg = this.segments[i];
      const { startTime, endTime } = seg;

      if (seconds >= startTime && seconds < endTime) {
        const t = (seconds - startTime) / (endTime - startTime);

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

  drawTrail(ctx: CanvasRenderingContext2D) {
    for (const tb of this.trailBalls) {
      if (tb.appearTime <= this.currentTime) {
        this._drawBall(ctx, tb.x, tb.y, '#000', tb.haloColor)
      }
    }
  }

  _drawBall(ctx: CanvasRenderingContext2D, x: number, y: number, fill: string, haloColor: string) {
    const r = this.size / 2;
    const xx = Math.round(x * 100) / 100;
    const yy = Math.round(y * 100) / 100;

    const glowWidth = 5; // 🌈 这里控制光晕的厚度（单位：像素）

    ctx.save();

    // 动态变化的 hue，用于彩色流动效果
    const glowColor = haloColor;
    const innerStop = Math.max((r - glowWidth) / r, 0);
    const innerRadius = r - glowWidth;

    // 创建从内部黑色到外部彩色光晕的渐变
    const gradient = ctx.createRadialGradient(xx, yy, innerRadius, xx, yy, r);
    gradient.addColorStop(0, fill);
    gradient.addColorStop(innerStop, fill); // 柔和过渡
    gradient.addColorStop(1, glowColor);

    // 绘制带有内边光晕的黑色球体
    ctx.beginPath();
    ctx.arc(xx, yy, r, 0, 2 * Math.PI);
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.restore();
  }

  drawBall(ctx: CanvasRenderingContext2D) {
    if (!this.skin || !this.frames || !this.sprite || !this.frames[this.state]) {
      this.drawTrail(ctx);
      this._drawBall(ctx, this.x, this.y, '#f0f0f0', getHaloColorByTime(this.currentTime));
      return;
    }

    const frame = this.frames[this.state][this.frameIndex];
    const { x: fx, y: fy, w: fw, h: fh } = frame;

    const drawW = this.size;
    const drawH = this.size;

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

  draw(ctx: CanvasRenderingContext2D) {
    this.drawTrail(ctx);
    this.drawBall(ctx);
  }

  getPosition(): Vec2 {
    return { x: this.x, y: this.y };
  }
}
