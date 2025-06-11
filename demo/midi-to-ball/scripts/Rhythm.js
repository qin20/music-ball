/**
 * ============================================================
 * 🎼 Rhythm.js（节奏可视化核心控制器）
 * ============================================================
 *
 * 📌 模块简介
 * ------------------------------------------------------------
 * Rhythm 是节奏动画系统的主控模块，负责整合小球路径（RhythmBall）、
 * 墙体碰撞与路径生成（RhythmWalls）、相机控制（Camera）与主题样式系统（RhythmThemes），
 * 根据传入的节奏事件（通常来自 MIDI）渲染同步的节奏可视化动画。
 *
 * 特点：
 * - 外部驱动的动画更新（基于传入 ms 时间）
 * - 支持可视化路径规划与不穿越墙体的轨迹生成
 * - 可扩展视觉风格（主题）、缩放视角、镜头平滑跟随等功能
 *
 *
 * ⚙️ 构造参数说明（new Rhythm(canvas, events, options)）
 * ------------------------------------------------------------
 * | 参数名    | 类型     | 默认值    | 说明                                                            |
 * |-----------|----------|-----------|-----------------------------------------------------------------|
 * | canvas    | Canvas   | 必填      | 绑定绘制的 canvas 元素                                          |
 * | events    | Array    | 必填      | 节奏事件数组（含 delta）                                        |
 * | options.theme | string | 'default' | 主题名称，对应 RhythmThemes 中定义                              |
 * | options.speed | number | 0.25     | 每毫秒对应的像素位移速度（delta × speed）                      |
 *
 *
 * 🧩 功能结构 / 方法说明
 * ------------------------------------------------------------
 * - constructor(canvas, events, options)
 *   初始化 Rhythm 实例：读取主题、生成墙体路径、创建小球与相机。

 * - setCurrentTime(ms)
 *   主动画推进方法：小球位置更新、墙体撞击激活、镜头更新、拖尾刷新等。
 *   由外部传入当前播放时间（毫秒），与音乐或 Tone.js 对齐。

 * - render()
 *   渲染当前帧内容（墙体遮罩、轨迹、发光墙、小球本体与拖尾），
 *   自动应用缩放和平移（camera.getTransform）到全局 canvas。

 *
 * 🧪 开发过程摘要 / 关键对话摘录
 * ------------------------------------------------------------
 * - ✅ 用户明确要求外部控制节奏推进 → 改用 `setCurrentTime(ms)` 替代 rAF 自驱动
 * - ✅ 引入 `RhythmPathPlanner`，用于生成不穿越墙体的反射轨迹
 * - ✅ 为确保墙体与轨迹同步，墙体计算逻辑集中于 RhythmWalls 内部管理
 * - ✅ 缩放与视角通过 Camera 模块统一管理，并支持缩放条交互控制
 * - ✅ render() 中调用 `walls.drawWallMask` 实现“黑色背景 + 通道挖空”的视觉风格
 * - ✅ 支持可视化路径、拖尾、碰撞发光，结合视觉主题完全解耦配置
 *
 *
 * 📁 模块状态
 * ------------------------------------------------------------
 * ✅ 已完成核心动画推进、组件集成、缩放相机支持
 * ✅ 支持主题切换 / 缩放 / 多路径切换扩展
 * ✅ 推荐绑定 Tone.Transport 控制音乐播放同步
 *
 * 🔄 最后修改：由清缘与 ChatGPT 合作开发，2025-05
 * ============================================================
 */

import { Camera } from './Camera.js';
import { RhythmWalls } from './RhythmWalls.js';
import { RhythmBall } from './RhythmBall.js';


export class Rhythm {
  constructor(canvas, events, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.center = { x: canvas.width / 2, y: canvas.height / 2 };
    this.events = events;

    this.options = {
      characterSize: 30,
      speed: options.speed || 0.25,
      ...options,
    };

    this.characterSkin = options.characterSkin || null; // ✅ 加入角色皮肤支持

    this.walls = new RhythmWalls({
      ...this.options
    });

    this.camera = new Camera(this.canvas, {
      safeMarginX: this.canvas.width * 0.1,
      safeMarginY: this.canvas.height * 0.1,
      easing: 0.15
    });

    this._lastTime = null;
    this._animating = false;
  }

  refresh() {
    // 重新生成墙体与路径（基于 events 和 speed）
    this.walls.calculateWalls(this.center, this.events, this.options.speed);

    // 更新 segments 并重新设置小球轨迹
    this.segments = this.walls.getSegments();

    // ✅ RhythmBall 支持角色皮肤
    this.ball = new RhythmBall(this.options, this.segments, this.characterSkin);

    // 相机缩放模式下自动缩放到路径
    if (this.camera.mode === 'fit') {
      this.camera.fitToPath(this.walls.getPath());
    }

    // 更新相机追踪与渲染
    this.camera.update(this.ball.getPosition());
  }

  setCurrentTime(ms) {
    this.ball.setCurrentTime(ms);
    this.walls.setCurrentTime(ms);

    this.camera.update(this.ball.getPosition());
    this.ball.addTrail();
    this.ball.updateTrail();
    this.ball.updateSpriteFrame?.(16);
    this.render();

    const lastEnd = this.segments[this.segments.length - 1]?.endTime ?? 0;
    return ms < lastEnd;
  }

  setWallPattern(pattern) {
    this.walls.setWallPattern(pattern);
    this.render(); // 立即重新绘制
  }

  setBgPattern(pattern) {
    this.walls.setBgPattern(pattern);
    this.render();
  }

  render() {
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.fillStyle = this.options.background || '#000';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const { scale, offsetX, offsetY } = this.camera.getTransform();
    ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);

    this.walls.drawWallMask(ctx, this.camera);
    this.walls.draw(ctx, this.camera);
    this.ball.drawTrail(ctx);
    this.ball.draw(ctx, this.options.characterSize);

    // ctx.save();
    // ctx.setTransform(1, 0, 0, 1, 0, 0); // 回到画布坐标
    // this.camera.drawSafeMargin(ctx);
    // ctx.restore();
  }
}
