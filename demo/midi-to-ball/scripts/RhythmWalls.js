/**
 * ============================================================
 * 🧱 RhythmWalls.js（节奏反射墙体与路径模块）
 * ============================================================
 *
 * 📌 模块简介
 * ------------------------------------------------------------
 * RhythmWalls 模块负责根据节奏事件（如 MIDI 音符）生成反射路径与墙体，
 * 通过 RhythmPathPlanner 栈式回溯算法确保路径不会穿越自身或其他墙体。
 *
 * 同时支持发光动画控制、路径遮罩（墙体挖空通道）绘制，以及调试辅助（轨迹线、节点）。
 * 本模块与 RhythmBall 可无缝联动，实现节奏可视化中的动态轨迹反射与撞墙反馈。
 *
 *
 * ⚙️ 构造参数说明（new RhythmWalls(options)）
 * ------------------------------------------------------------
 * | 参数名             | 类型     | 默认值               | 说明                                                           |
 * |--------------------|----------|----------------------|----------------------------------------------------------------|
 * | characterSize         | Number   | 必传                 | 小球半径，用于推导 wallLength、wallThickness、pathWidth       |
 * | wallThickness      | Number   | characterSize / 4       | 墙体宽度（自动推导）                                           |
 * | wallLength         | Number   | characterSize       | 墙体长度（自动推导）                                           |
 * | wallColor          | String   | 必须设置             | 墙体基础颜色（用于绘制）                                       |
 * | background         | String   | '#000'               | 遮罩背景色（用于 drawWallMask）                                |
 *
 *
 * 🧩 功能结构说明
 * ------------------------------------------------------------
 * - calculateWalls(center, events, speed)
 *   使用 RhythmPathPlanner 生成路径 path、墙体 walls、时间段 segments。
 *
 * - triggerGlow(index)
 *   触发第 index 面墙的发光状态（通常由 RhythmBall 撞击时调用）。
 *
 * - updateGlow(now)
 *   每帧更新 glowLevel，根据当前时间与 glowStartTime 计算衰减进度。
 *
 * - draw(ctx)
 *   渲染所有墙体（包含发光效果）、路径轨迹线和节点（调试用）。
 *
 * - drawDebug(ctx)
 *   绘制路径轨迹线 + 顶点节点小球（通常用于调试或可选辅助视觉）。
 *
 * - drawWallMask(ctx, padding = 20)
 *   以遮罩形式绘制路径通道：整张画布先填充黑色，再在路径上“抠出”可通行区域。
 *
 * - getPath()
 *   返回路径节点数组，用于同步 camera 或小球位移。
 *
 * - getSegments()
 *   返回每段路径的起止时间和位移，供节奏控制驱动位置插值。
 *
 * - activeGlowCount
 *   返回当前仍处于发光状态的墙体数量（用于判断是否继续播放或渲染）。
 *
 *
 * 🛠️ 开发摘要与关键对话摘录
 * ------------------------------------------------------------
 * - ✅ 引入 RhythmPathPlanner 回溯算法以保证路径不穿越自身和墙体
 * - ✅ 添加 drawWallMask 实现节奏可视化中“墙体通道挖空”效果
 * - ✅ 支持可选轨迹线与节点绘制，便于调试和观察反射路径正确性
 * - ✅ 将所有视觉参数（如 thickness、length、glow）从 characterSize 自动推导
 * - ✅ 发光效果支持 easingIn / easingOut 分阶段动画控制
 *
 *
 * 📁 模块状态
 * ------------------------------------------------------------
 * ✅ 已应用于节奏路径可视化、墙体反射反馈、节奏轨迹遮罩
 * ✅ 与 RhythmBall / Camera / PathPlanner 等模块解耦可独立复用
 * ✅ 支持未来扩展：路径评分、多方案切换、自定义墙体风格主题等
 *
 * 🔄 最后修改：由清缘与 ChatGPT 合作设计，2025-05
 * ============================================================
 */


import { RhythmPathPlanner } from './RhythmPathPlanner.Stack.js';

export class RhythmWalls {
  constructor(options = {}) {
    this.options = {
      ...options,
      wallThickness: options.characterSize / 4,
      wallLength: options.characterSize,
    };

    this.walls = [];
    this.path = [];
    this._activeGlowCount = 0;
  }

  _compressEvents(events, minDelta) {
    if (minDelta <= 0) {
      return events.map(e => ({ ...e }));
    }

    const compressed = [];
    let group = [];

    for (let i = 0; i < events.length; i++) {
      const note = events[i];

      if (group.length === 0) {
        group.push(note);
      } else {
        const anchor = group[0];
        const delta = note.time - anchor.time;

        if (delta < minDelta) {
          group.push(note);
        } else {
          compressed.push({ ...anchor });
          group = [note];
        }
      }
    }

    if (group.length > 0) {
      compressed.push({ ...group[0] });
    }

    const originalFirstDelta = events[0].delta ?? events[0].time;

    return compressed.map((curr, i) => {
      const prev = compressed[i - 1];
      return {
        ...curr,
        delta: i === 0 ? originalFirstDelta : curr.time - prev.time
      };
    });
  }

  calculateWalls(center, events, speed) {
    const minDelta = this.options.minWallDelta ?? 80;
    console.log(events);
    const filteredEvents = this._compressEvents(events, minDelta);
    console.log(filteredEvents);
    const planner = new RhythmPathPlanner(center, filteredEvents, speed, this.options);
    const solution = planner.generate();

    this.path = solution.path;
    this.walls = solution.walls;
    this.segments = solution.segments;
  }

  setCurrentTime(currentTime) {
    for (let i = 0; i < this.walls.length; i++) {
      const seg = this.segments[i];
      const wall = this.walls[i];

      if (!seg || !wall) continue;

      for (const effect of wall.effects) {
        effect.setCurrentTime(currentTime);
      }
    }
  }

  draw(ctx) {
    for (let i = 0; i < this.walls.length; i++) {
      const wall = this.walls[i];
      const { start, end, effects = [] } = wall;

      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const length = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);
      const thickness = this.options.wallThickness;

      ctx.save();
      ctx.translate(start.x, start.y);
      ctx.rotate(angle);
      ctx.fillStyle = this.wallPattern ?? this.wallColor ?? '#333';
      ctx.fillRect(0, -thickness / 2, length, thickness);
      ctx.restore();

      for (const effect of effects) {
        if (effect.draw) effect.draw(ctx);
      }
    }

    if (this.options.debug) {
      this.drawDebug(ctx);
    }
  }

  drawDebug(ctx) {
    // 在墙体渲染中绘制小球轨迹线
    ctx.save();
    ctx.strokeStyle = '#fff'; // 可自定义主题色
    ctx.lineWidth = 2;
    ctx.beginPath();

    if (this.path.length > 0) {
      ctx.moveTo(this.path[0].x, this.path[0].y);
      for (let i = 1; i < this.path.length; i++) {
        ctx.lineTo(this.path[i].x, this.path[i].y);
      }
    }

    ctx.stroke();
    ctx.restore();

    // draw nodes along path
    ctx.save();
    ctx.fillStyle = '#ccc';
    const radius = this.options.characterSize / 2;

    for (const pt of this.path) {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawWallMask(ctx, camera) {
    const padding = this.options?.characterSize;
    ctx.save();

    const { wallColor = '#222', background = '#fff' } = this.options;
    const { scale, offsetX, offsetY } = camera.getTransform();

    // Step 0: 计算当前视野在世界坐标系下的实际区域
    const canvas = ctx.canvas;
    const x = -offsetX / scale;
    const y = -offsetY / scale;
    const width = canvas.width / scale;
    const height = canvas.height / scale;

    // Step 1: 铺满当前可见区域（不是轨迹范围）
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = this.wallPattern || wallColor;
    ctx.fillRect(x, y, width, height);

    // Step 2: 抠出通道路径
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = background;
    for (const seg of this.segments) {
      const { startPos, endPos } = seg;

      const x1 = Math.min(startPos.x, endPos.x);
      const x2 = Math.max(startPos.x, endPos.x);
      const y1 = Math.min(startPos.y, endPos.y);
      const y2 = Math.max(startPos.y, endPos.y);

      ctx.fillRect(
        x1 - padding / 2,
        y1 - padding / 2,
        (x2 - x1) + padding,
        (y2 - y1) + padding
      );
    }

    // Step 3: 用纹理或背景色补上抠出的通道
    ctx.globalCompositeOperation = 'destination-over';
    ctx.fillStyle = this.bgPattern || background;
    ctx.fillRect(x, y, width, height);

    ctx.restore();
  }

  _computePathBounds(pad = 0) {
    const xs = this.path.map(p => p.x);
    const ys = this.path.map(p => p.y);

    const minX = Math.min(...xs) - pad;
    const maxX = Math.max(...xs) + pad;
    const minY = Math.min(...ys) - pad;
    const maxY = Math.max(...ys) + pad;

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  getPath() {
    return this.path;
  }

  getSegments() {
    return this.segments;
  }

  setWallPattern(pattern) {
    this.wallPattern = pattern;
  }

  setBgPattern(pattern) {
    this.bgPattern = pattern;
  }

  get activeGlowCount() {
    return this._activeGlowCount;
  }
}
