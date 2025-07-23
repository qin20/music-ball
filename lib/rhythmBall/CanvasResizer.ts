export class CanvasResizer {
  private canvas: HTMLCanvasElement;
  private _resizeHandler: (() => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    if (!(canvas instanceof HTMLCanvasElement)) {
      throw new Error('CanvasResizer: canvas must be an HTMLCanvasElement');
    }
    this.canvas = canvas;
  }

  /**
   * 设置 canvas 的像素和 CSS 尺寸
   */
  setSize(width: number, height: number) {
    this.canvas.width = width;
    this.canvas.height = height;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
  }

  /**
   * 设为目标比例，基于给定容器尺寸动态计算 canvas 尺寸
   */
  setAspectRatio(ratioW: number, ratioH: number, containerWidth: number, containerHeight: number) {
    const containerRatio = containerWidth / containerHeight;
    const targetRatio = ratioW / ratioH;

    let width: number, height: number;
    if (containerRatio > targetRatio) {
      height = containerHeight;
      width = Math.round(height * targetRatio);
    } else {
      width = containerWidth;
      height = Math.round(width / targetRatio);
    }

    this.setSize(width, height);
  }

  /**
   * 填满整个容器（可选高分屏缩放）
   */
  fillContainer(containerWidth: number, containerHeight: number, matchPixelRatio: boolean = true) {
    const dpr = matchPixelRatio ? window.devicePixelRatio || 1 : 1;
    this.setSize(containerWidth * dpr, containerHeight * dpr);
  }

  /**
   * 启用自动监听窗口大小变化，并调用 getContainerSize 获取容器尺寸
   */
  enableAutoResize({
    mode = 'fill',
    getContainerSize,
    onResize,
    matchPixelRatio = true
  }: {
    mode?: 'fill' | [number, number];
    getContainerSize: () => { width: number; height: number };
    onResize?: (canvasWidth: number, canvasHeight: number, containerWidth: number, containerHeight: number) => void;
    matchPixelRatio?: boolean;
  }) {
    if (typeof getContainerSize !== 'function') {
      throw new Error('CanvasResizer: getContainerSize must be a function');
    }

    this.disableAutoResize();

    const resizeFn = () => {
      const { width, height } = getContainerSize();
      if (mode === 'fill') {
        this.fillContainer(width, height, matchPixelRatio);
      } else if (Array.isArray(mode) && mode.length === 2) {
        this.setAspectRatio(mode[0], mode[1], width, height);
      } else {
        console.warn('[CanvasResizer] Unsupported resize mode:', mode);
      }
      onResize?.(this.canvas.width, this.canvas.height, width, height);
    };

    window.addEventListener('resize', resizeFn);
    this._resizeHandler = resizeFn;
    resizeFn();
  }

  resize() {
    this._resizeHandler?.();
  }

  /**
   * 停止自动监听
   */
  disableAutoResize() {
    if (this._resizeHandler) {
      window.removeEventListener('resize', this._resizeHandler);
      this._resizeHandler = null;
    }
  }
}
