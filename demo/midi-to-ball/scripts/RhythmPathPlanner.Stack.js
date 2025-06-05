
/**
 * ============================================================
 * 🧠 RhythmPathPlanner.Stack.js（基于回溯的节奏轨迹生成器）
 * ============================================================
 *
 * 📌 模块简介
 * ------------------------------------------------------------
 * 本模块基于栈式回溯算法，自动为一段节奏事件（如 MIDI 音符）生成一条合法的小球运动轨迹，
 * 小球每次移动沿 45° 对角线前进，反射方式仅允许垂直或水平方向切换，
 * 并通过 SAT 碰撞检测确保小球路径不会穿过任何墙体或路径区域。
 *
 * 支持固定反射方向（如始终水平）或随机反射探索，可用于生成多个候选轨迹方案。
 * 生成结果包含：路径点数组、墙体信息、路径段（含时间）等。
 *
 *
 * ⚙️ 构造参数（new RhythmPathPlanner(center, events, speed, options)）
 * ------------------------------------------------------------
 * | 参数名          | 类型     | 默认值     | 说明                                                        |
 * |-----------------|----------|------------|-------------------------------------------------------------|
 * | center          | Object   | 必传       | 小球起点坐标 `{x, y}`                                       |
 * | events          | Array    | 必传       | 节奏事件数组，需包含 delta 毫秒值                           |
 * | speed           | Number   | 必传       | 每毫秒对应的位移速度（如 0.2 表示每 1ms 前进 0.2 像素）     |
 * | options.characterSize     | Number | 9    | 小球半径，用于推导通道宽度和墙体偏移                        |
 * | options.wallThickness  | Number | 3    | 墙体线宽，用于绘制与碰撞区域生成                            |
 * | options.wallLength     | Number | 80   | 墙体长度，用于绘制反射面                                    |
 * | options.random         | Boolean| false| 是否启用随机反射方向探索                                    |
 * | options.minDistance    | Number | 4r   | 最小视觉移动距离（默认自动推导为小球直径的 2 倍）           |
 * | options.pathWidth      | Number | 2r   | 小球通道宽度（默认为小球直径，自动推导）                    |
 *
 *
 * 🧩 功能结构 / 方法说明
 * ------------------------------------------------------------
 * - generate()
 *   返回一条合法路径（失败则抛出错误）。内部调用 generateMultiple(1)[0]。

 * - generateMultiple(maxSolutions)
 *   返回多条可行路径（默认最多 1 条）。使用栈结构回溯并进行 SAT 碰撞检测。

 * - createPathPolygon(p1, p2, width)
 *   根据两点和通道宽度生成路径的矩形（使用 sat.js 的 Polygon）。

 * - polygonsIntersect(p1, p2)
 *   使用 SAT 检测两个 Polygon 是否发生碰撞（重叠 > 0.1 才算交集）。
 *
 *
 * 📦 返回结构说明（generate / generateMultiple）
 * ------------------------------------------------------------
 * 每条路径对象结构如下：
 * {
 *   path:     [{ x, y }, ...],        // 小球每个顶点坐标
 *   walls:    [{ start, end, ... }],  // 墙体线段数据
 *   segments: [{
 *     startTime, endTime,
 *     startPos, endPos
 *   }, ...]                           // 每段路径的时间与空间范围
 * }
 *
 *
 * 🛠️ 开发摘要 / 关键对话摘录
 * ------------------------------------------------------------
 * - ✅ 用户提出“墙体必须不能被穿越”的规则，原始随机生成法不再适用
 * - ✅ 改用栈式回溯算法，记录每个状态的方向尝试情况，支持回退重试
 * - ✅ 使用 SAT.js（Separating Axis Theorem）进行通道与墙体精确碰撞检测
 * - ✅ 引入 pathPolygons 与 wallPolygons 两套碰撞缓存，分别避免路径↔墙交叉
 * - ✅ 实现 generateMultiple(n) 支持批量生成用于路径选择切换
 * - ✅ 当前默认反射方向为 H（水平），如需改为随机，只需解注 direction 判断
 *
 *
 * 📁 模块状态
 * ------------------------------------------------------------
 * ✅ 已集成节奏路径生成、墙体同步、碰撞检测
 * ✅ 兼容 RhythmWalls / RhythmBall 渲染与动画逻辑
 * ✅ 可用于“点击刷新轨迹”或“多轨路径评分”扩展场景
 *
 * 🔄 最后修改：由清缘与 ChatGPT 合作设计，2025-05
 * ============================================================
 */


import SAT from '../lib/sat.js';
import { createConfettiEffect } from './effects/createConfettiEffect.js';
import { createGlowEffect } from './effects/createGlowEffect.js';

function createPathPolygon(p1, p2, width = 8) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  const ux = dx / len;
  const uy = dy / len;
  const nx = -uy;
  const ny = ux;
  const hw = width / 2;

  const a = new SAT.Vector(p1.x + nx * hw, p1.y + ny * hw);
  const b = new SAT.Vector(p1.x - nx * hw, p1.y - ny * hw);
  const c = new SAT.Vector(p2.x - nx * hw, p2.y - ny * hw);
  const d = new SAT.Vector(p2.x + nx * hw, p2.y + ny * hw);

  return new SAT.Polygon(new SAT.Vector(), [a, b, c, d]);
}

function polygonsIntersect(p1, p2) {
  const response = new SAT.Response();
  const collided = SAT.testPolygonPolygon(p1, p2, response);
  return collided && response.overlap > 0.1;
}

export class RhythmPathPlanner {
  constructor(center, events, speed, options = {}) {
    this.center = center;
    this.events = events;
    this.speed = speed;

    this.options = {
      ...options,
      minDistance: options.characterSize * 2, // 小球直径两倍
      pathWidth: options.characterSize // 小球直径
    };
  }

  generate() {
    return this.generateMultiple()[0];
  }

  generateMultiple(maxSolutions = 1) {
    const offset = this.options.characterSize / 2 + this.options.wallThickness / 2;
    const wallLen = this.options.wallLength;
    const wallThickness = this.options.wallThickness;
    const minDist = this.options.minDistance;
    const pathWidth = this.options.pathWidth;

    const solutions = [];
    const directions = [
      { dx: 1, dy: 1 },   // ↘
      { dx: 1, dy: -1 },  // ↗
      { dx: -1, dy: -1 }, // ↖
      { dx: -1, dy: 1 }   // ↙
    ];
    const randomDir = directions[Math.floor(Math.random() * directions.length)];
    const stack = [{
      index: 0,
      pos: { ...this.center },
      dx: randomDir.dx,
      dy: randomDir.dy,
      tried: []
    }];

    const currentPath = [{ ...this.center }];
    const currentWalls = [];
    const currentSegments = [];
    const pathPolygons = [];
    const wallPolygons = [];

    const tryNext = () => {
      while (stack.length > 0) {
        const state = stack[stack.length - 1];

        // 成功构造完整路径
        if (state.index >= this.events.length) {
          solutions.push({
            path: [...currentPath],
            walls: [...currentWalls],
            segments: [...currentSegments]
          });

          if (solutions.length === maxSolutions) {
            return true;
          }

          // 回溯继续探索其它路径
          stack.pop();
          currentPath.pop();
          currentWalls.pop();
          currentSegments.pop();
          pathPolygons.pop();
          wallPolygons.pop();
          continue;
        }

        if (state.tried.length === 2) {
          stack.pop();
          currentPath.pop();
          currentWalls.pop();
          currentSegments.pop();
          pathPolygons.pop();
          wallPolygons.pop();
          continue;
        }

        const direction = state.tried.length
          ? (state.tried.includes('H') ? 'V' : 'H')
          : (Math.random() > 0.5 ? 'H' : 'V');

        // const direction = 'V'; // ✅ 只使用水平反射
        state.tried.push(direction);

        const midi = this.events[state.index].midi;
        const delta = this.events[state.index].delta;
        const hitTime = this.events[state.index].time;
        const dist = Math.max(delta * this.speed, minDist);
        const step = dist / Math.sqrt(2);
        const nextPos = {
          x: state.pos.x + state.dx * step,
          y: state.pos.y + state.dy * step
        };

        const nextDx = direction === 'V' ? -state.dx : state.dx;
        const nextDy = direction === 'H' ? -state.dy : state.dy;

        const wall = direction === 'V'
          ? {
              start: { x: nextPos.x + state.dx * offset, y: nextPos.y - wallLen / 2 },
              end:   { x: nextPos.x + state.dx * offset, y: nextPos.y + wallLen / 2 }
            }
          : {
              start: { x: nextPos.x - wallLen / 2, y: nextPos.y + state.dy * offset },
              end:   { x: nextPos.x + wallLen / 2, y: nextPos.y + state.dy * offset }
            };

        const pathPolygon = createPathPolygon(state.pos, nextPos, pathWidth);
        if (wallPolygons.some(w => polygonsIntersect(w, pathPolygon))) {
          continue;
        };

        const wallPolygon = createPathPolygon(wall.start, wall.end, wallThickness);
        if (wallPolygons.some(w => polygonsIntersect(w, wallPolygon))) {
          continue;
        };

        if (pathPolygons.some(p => polygonsIntersect(p, wallPolygon))) {
          continue; // 墙体不能覆盖已有路径区域
        }

        currentPath.push({ ...nextPos });

        const hitColor = `hsl(${(midi * 17 + 10) % 360}, 100%, 60%)`;
        currentWalls.push({
          ...wall,
          hitColor,
          effects: [
            createGlowEffect({ wall, ...this.options, hitColor, hitTime }),
            createConfettiEffect({
              wall,
              hitTime,
              dx: state.dx,
              dy: state.dy,
              direction,
              ...this.options
            })
          ]
        });
        currentSegments.push({
          startTime: currentSegments.length === 0 ? 0 : currentSegments.at(-1).endTime,
          endTime: (currentSegments.length === 0 ? 0 : currentSegments.at(-1).endTime) + delta,
          startPos: { ...state.pos },
          endPos: { ...nextPos }
        });
        pathPolygons.push(pathPolygon);
        wallPolygons.push(wallPolygon);

        stack.push({
          index: state.index + 1,
          pos: { ...nextPos },
          dx: nextDx,
          dy: nextDy,
          tried: []
        });
      }

      return false;
    };

    tryNext();

    if (solutions.length === 0) {
      throw new Error('无法为当前节奏序列生成合法轨迹');
    }

    return solutions;
  }
}
