// 📸 Camera.ts（视角控制与缩放模块）

export type CameraMode = 'follow' | 'all';
export const CameraModes = {
  FOLLOW: 'follow' as CameraMode,
  ALL: 'all' as CameraMode,
};

export interface Vec2 {
  x: number;
  y: number;
}

export interface CameraOptions {
  safeMarginX?: number;
  safeMarginY?: number;
}

export class Camera {
  private canvas: HTMLCanvasElement;

  private safeMarginX: number;
  private safeMarginY: number;

  public mode: CameraMode = CameraModes.ALL;
  public scale = 1;
  public offsetX = 0;
  public offsetY = 0;
  public position: Vec2 = { x: 0, y: 0 };
  private paths: Vec2[] = [];

  constructor(canvas: HTMLCanvasElement, options: CameraOptions = {}) {
    this.canvas = canvas;
    this.safeMarginX = options.safeMarginX ?? 0;
    this.safeMarginY = options.safeMarginY ?? 0;
  }

  setMargin(x: number, y: number) {
    this.safeMarginX = x ?? 0;
    this.safeMarginY = y ?? 0;
  }

  /**
   * 设置相机模式
   */
  setMode(mode: CameraMode) {
    this.mode = mode;
  }

  /**
   * 自动适配路径（用于 fit 模式）
   */
  setData(paths: Vec2[], padding = 60) {
    if (!paths || paths.length === 0) return;

    this.paths = paths;

    const xs = paths.map(p => p.x);
    const ys = paths.map(p => p.y);

    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const w = maxX - minX + padding * 2;
    const h = maxY - minY + padding * 2;

    const scaleX = this.canvas.width / w;
    const scaleY = this.canvas.height / h;
    this.scale = Math.min(scaleX, scaleY);

    this.offsetX = -minX * this.scale + (this.canvas.width - (maxX - minX) * this.scale) / 2;
    this.offsetY = -minY * this.scale + (this.canvas.height - (maxY - minY) * this.scale) / 2;
  }

  /**
   * 获取当前画布变换参数
   */
  getTransform() {
    if (this.mode === CameraModes.ALL) {
      return {
        scale: this.scale,
        offsetX: this.offsetX,
        offsetY: this.offsetY
      };
    }

    return {
      scale: 1,
      offsetX: -this.position.x,
      offsetY: -this.position.y
    };
  }

  /**
   * 跟随目标更新相机位置（仅 pixel 模式）
   */
  update(target: Vec2) {
    if (this.mode !== CameraModes.FOLLOW) return;

    const cam = this.position;

    const viewLeft = cam.x;
    const viewRight = cam.x + this.canvas.width;
    const viewTop = cam.y;
    const viewBottom = cam.y + this.canvas.height;

    let shiftX = 0;
    let shiftY = 0;

    if (target.x < viewLeft + this.safeMarginX) {
      shiftX = target.x - (viewLeft + this.safeMarginX);
    } else if (target.x > viewRight - this.safeMarginX) {
      shiftX = target.x - (viewRight - this.safeMarginX);
    }

    if (target.y < viewTop + this.safeMarginY) {
      shiftY = target.y - (viewTop + this.safeMarginY);
    } else if (target.y > viewBottom - this.safeMarginY) {
      shiftY = target.y - (viewBottom - this.safeMarginY);
    }

    cam.x += shiftX;
    cam.y += shiftY;
  }

  /**
   * 可视化安全边界（红色区域）
   */
  drawSafeMargin(ctx: CanvasRenderingContext2D) {
    if (this.mode !== CameraModes.FOLLOW) return;

    const x = this.safeMarginX;
    const y = this.safeMarginY;
    const w = this.canvas.width - this.safeMarginX * 2;
    const h = this.canvas.height - this.safeMarginY * 2;

    ctx.save();
    ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)';
    ctx.lineWidth = 1;
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);
    ctx.restore();
  }

  /**
   * 获取当前视窗坐标（世界单位）
   */
  getViewport() {
    return {
      left: this.position.x,
      top: this.position.y,
      right: this.position.x + this.canvas.width,
      bottom: this.position.y + this.canvas.height
    };
  }
}
