/**
 * Camera.js（视角控制与缩放模式模块）
 * =======================================
 *
 * 📦 模块简介
 * ---------------------------------------
 * 支持两种视角控制模式：
 * 1. pixel 模式：小球以真实像素大小运动，视角立即跟随目标超出安全区；
 * 2. fit 模式：全局路径适配 canvas，静态居中缩放，无视角偏移。
 *
 * 📦 模块用途
 * ---------------------------------------
 * - 即时相机（pixel 模式）
 * - 路径自动居中缩放（fit 模式）
 * - 提供统一的 transform 矩阵给 canvas 使用
 *
 * 🧰 配置参数说明（构造函数 options）
 * ---------------------------------------
 * | 参数名        | 类型    | 默认值 | 说明                                              |
 * |---------------|---------|--------|---------------------------------------------------|
 * | safeMarginX   | Number  | 120    | 水平方向缓冲区（仅 pixel 模式有效）               |
 * | safeMarginY   | Number  | 120    | 垂直方向缓冲区                                     |
 * | safeMargin    | Number  | 120    | 统一设置 X/Y 缓冲边距（若未显式指定）             |
 */

export class Camera {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.options = options; // ✅ 保留完整配置

    const marginX = options.safeMarginX ?? options.safeMargin ?? 120;
    const marginY = options.safeMarginY ?? options.safeMargin ?? 120;

    this.safeMarginX = marginX;
    this.safeMarginY = marginY;

    this.mode = 'pixel';
    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;
    this.position = { x: 0, y: 0 };
    this.path = [];
  }

  /**
   * 设置模式
   * @param {'pixel'|'fit'} mode
   */
  setMode(mode) {
    this.mode = mode;

    if (mode === 'fit') {
      this.fitToPath(this.path); // 自动计算缩放并居中
    } else {
      this.scale = 1;
    }
  }

  /**
   * 设定路径并计算缩放（fit 模式）
   * @param {Array} path - 小球路径 [{x, y}, ...]
   * @param {number} padding - 额外边距
   */
  fitToPath(path, padding = 60) {
    if (!path || path.length === 0) return;

    this.path = path;

    const minX = Math.min(...path.map(p => p.x));
    const maxX = Math.max(...path.map(p => p.x));
    const minY = Math.min(...path.map(p => p.y));
    const maxY = Math.max(...path.map(p => p.y));

    const w = maxX - minX + padding * 2;
    const h = maxY - minY + padding * 2;

    const scaleX = this.canvas.width / w;
    const scaleY = this.canvas.height / h;

    this.scale = Math.min(scaleX, scaleY);

    // 居中偏移量
    this.offsetX = -minX * this.scale + (this.canvas.width - (maxX - minX) * this.scale) / 2;
    this.offsetY = -minY * this.scale + (this.canvas.height - (maxY - minY) * this.scale) / 2;
  }

  /**
   * 获取当前变换矩阵（供 ctx.setTransform 使用）
   */
  getTransform() {
    if (this.mode === 'fit') {
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
   * 更新视角位置（仅 pixel 模式有效，无缓动）
   * @param {{x: number, y: number}} target
   */
  update(target) {
    if (this.mode !== 'pixel') return;

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
   * 在 canvas 上绘制危险缓冲区（仅 pixel 模式）
   * @param {CanvasRenderingContext2D} ctx
   */
  drawSafeMargin(ctx) {
    if (this.mode !== 'pixel') return;

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
   * 返回当前视窗范围（单位：世界坐标）
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
