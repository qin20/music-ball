/**
 * CanvasResizer.js（Canvas 自适应缩放模块）
 * =======================================
 *
 * 📦 模块简介
 * ---------------------------------------
 * CanvasResizer 是一个通用的 Canvas 尺寸控制与响应式缩放工具类，
 * 用于在高分屏、自适应布局或等比缩放场景中动态调整 Canvas 的尺寸与样式。
 *
 * 主要支持两种模式：
 * - 填满容器（fill）：像素填充整个容器区域，适配 Retina 显示
 * - 固定比例（[宽比, 高比]）：保持指定宽高比缩放，居中显示
 *
 * 提供手动设置大小、适配容器、监听窗口大小变化等功能。
 *
 *
 * 🧰 配置参数说明（用于 enableAutoResize）
 * ---------------------------------------
 *
 * | 参数名             | 类型               | 默认值     | 说明                                                               |
 * |--------------------|--------------------|------------|--------------------------------------------------------------------|
 * | `mode`             | `'fill'` 或 `[w,h]`| `'fill'`   | 缩放模式。可为 `'fill'` 填满容器，或 `[16, 9]` 指定宽高比          |
 * | `getContainerSize` | `function`         | 必填       | 返回当前容器尺寸的函数，格式为 `() => ({ width, height })`         |
 * | `matchPixelRatio`  | `boolean`          | `true`     | 是否按设备像素比放大 Canvas 像素（用于高分屏渲染）                |
 *
 *
 * 🧠 方法结构说明
 * ---------------------------------------
 *
 * - `constructor(canvas)`
 *   创建 CanvasResizer 实例，传入 HTMLCanvasElement。
 *
 * - `setSize(width, height)`
 *   设置 canvas 的像素大小和 CSS 样式宽高。
 *
 * - `setAspectRatio(w, h, containerWidth, containerHeight)`
 *   设置目标宽高比并根据容器尺寸计算实际 canvas 尺寸。
 *
 * - `fillContainer(containerWidth, containerHeight, matchPixelRatio)`
 *   填充整个容器，支持设备像素缩放。
 *
 * - `enableAutoResize({ mode, getContainerSize, matchPixelRatio })`
 *   启用响应式自动缩放，监听窗口变化自动调整 canvas 尺寸。
 *
 * - `disableAutoResize()`
 *   停止监听窗口大小变化。
 *
 *
 * 🧪 开发过程摘要 / 关键对话摘录
 * ---------------------------------------
 *
 * - ✅ 用户希望 canvas 能适配不同窗口尺寸，支持等比缩放和全屏铺满两种模式。
 * - ✅ 初期实现使用固定比例 `[16, 9]`，随后加入 `'fill'` 模式适配完整容器。
 * - ✅ 为支持高分屏，加入 `matchPixelRatio` 参数，兼顾物理像素与视觉尺寸。
 * - ✅ 模块可搭配动画系统使用，保持 canvas 精确尺寸和渲染比例。
 */


export class CanvasResizer {
  constructor(canvas) {
    if (!(canvas instanceof HTMLCanvasElement)) {
      throw new Error('CanvasResizer: canvas must be an HTMLCanvasElement');
    }

    this.canvas = canvas;
    this._resizeHandler = null;
  }

  /**
   * 设置 canvas 的像素和 CSS 尺寸
   */
  setSize(width, height) {
    this.canvas.width = width;
    this.canvas.height = height;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
  }

  /**
   * 设为目标比例，基于给定容器尺寸动态计算 canvas 尺寸
   */
  setAspectRatio(ratioW, ratioH, containerWidth, containerHeight) {
    const containerRatio = containerWidth / containerHeight;
    const targetRatio = ratioW / ratioH;

    let width, height;
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
  fillContainer(containerWidth, containerHeight, matchPixelRatio = true) {
    const dpr = matchPixelRatio ? window.devicePixelRatio || 1 : 1;
    this.setSize(containerWidth * dpr, containerHeight * dpr);
  }

  /**
   * 启用自动监听窗口大小变化，并调用 getContainerSize 获取容器尺寸
   * @param {Object} options
   * @param {'fill' | [number, number]} options.mode
   * @param {() => { width: number, height: number }} options.getContainerSize
   * @param {boolean} [options.matchPixelRatio=true]
   */
  enableAutoResize({ mode = 'fill', getContainerSize, matchPixelRatio = true }) {
    if (typeof getContainerSize !== 'function') {
      throw new Error('CanvasResizer: getContainerSize must be a function');
    }

    this.disableAutoResize(); // 避免重复绑定

    const resizeFn = () => {
      const { width, height } = getContainerSize(); // 每次获取最新容器尺寸
      if (mode === 'fill') {
        this.fillContainer(width, height, matchPixelRatio);
      } else if (Array.isArray(mode) && mode.length === 2) {
        this.setAspectRatio(mode[0], mode[1], width, height);
      } else {
        console.warn('[CanvasResizer] Unsupported resize mode:', mode);
      }
    };

    window.addEventListener('resize', resizeFn);
    this._resizeHandler = resizeFn;
    resizeFn(); // 初次执行
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
