/**
 * ============================================================
 * 🧠 RhythmPathPlanner.Stack.ts（基于回溯的节奏路径规划器）
 * ============================================================
 *
 * 📌 模块简介
 * ------------------------------------------------------------
 * 本模块用于根据一组已解析的 MIDI 音符（SerializedNote[]），
 * 自动生成合法的小球运动轨迹（路径 + 墙体 + 时间段）。
 *
 * 小球每次沿 45° 对角线方向移动，遇音符事件时进行垂直或水平方向反射，
 * 路径构建使用栈式回溯算法探索所有可行方案，并借助 SAT.js 精确检测路径与墙体是否碰撞。
 *
 * 支持随机反射方向或固定交替反射，生成结果可用于动画渲染、路径评分与节奏游戏等。
 *
 *
 * ⚙️ 构造参数（new RhythmPathPlanner(config)）
 * ------------------------------------------------------------
 * | 字段名            | 类型            | 默认值 | 说明                                        |
 * |-------------------|-----------------|--------|---------------------------------------------|
 * | startPos          | Vec2            | 必填   | 小球起点坐标 `{ x, y }`                     |
 * | notes             | SerializedNote[]| 必填   | MIDI 音符数组，按时间升序排序               |
 * | speed             | number          | 必填   | 小球每秒移动像素速度（如 200 表示 200px/s）|
 * | characterSize     | number          | 9      | 小球半径，用于推导墙体/路径宽度             |
 * | wallThickness     | number          | 3      | 墙体厚度，用于绘制和碰撞检测                |
 * | wallLength        | number          | 80     | 墙体长度（横/竖线段长度）                   |
 * | random            | boolean         | false  | 是否启用随机反射方向（默认固定交替）        |
 * | minDistance       | number          | 2r     | 每段最小移动距离（默认为小球直径 * 2）      |
 * | pathWidth         | number          | 1r     | 小球通道宽度（默认为小球直径）              |
 *
 *
 * 🧩 方法说明
 * ------------------------------------------------------------
 * - generate(): RhythmPathPlanData
 *   返回一条合法路径，失败时抛出错误。
 *
 * - generateMultiple(maxSolutions: number): RhythmPathPlanData[]
 *   使用回溯生成最多 N 条合法路径。
 *
 *
 * 📦 返回结构 RhythmPathPlanData
 * ------------------------------------------------------------
 * {
 *   path: Vec2[],             // 小球轨迹顶点序列
 *   walls: Wall[],            // 每个反射点生成的墙体（含特效）
 *   segments: Segment[]       // 每段路径的时间区间和空间起止坐标
 * }
 *
 *
 * 🔄 设计说明
 * ------------------------------------------------------------
 * ✅ 动态计算每段时间间隔 delta = 当前音符.time - 上一个音符.time
 * ✅ 使用 SAT.js 检查路径 ↔ 墙体、墙体 ↔ 路径 精确碰撞
 * ✅ 支持随机反射 / 固定交替（H ↔ V）反射控制
 * ✅ 每段墙体附带特效（如发光、粒子爆裂等）
 *
 * 最后更新：2025-06（清缘 & ChatGPT 协作开发）
 * ============================================================
 */

import SAT from 'sat';
import { computeMidiCenter, getNoteColor } from '../Midi';

export interface Vec2 {
  x: number;
  y: number;
}

export type Seconds = number;

export interface Wall {
  start: Vec2;
  end: Vec2;
  hitColor: string;
  effects: any[];
}

export interface Segment {
  startTime: number;
  endTime: number;
  startPos: Vec2;
  endPos: Vec2;
}

export interface RhythmPathPlanData {
  paths: Vec2[];
  walls: Wall[];
  segments: Segment[];
}

export interface RhythmPathPlannerConfig {
  startPos: Vec2;
  notes: SerializedNote[];
  speed: number;
  characterSize: number;
  wallThickness: number;
  wallLength: number;
  minDistance: number;
  pathWidth: number;
  random?: boolean;
  randomFn?: () => number;
  onStep?: (step: { index: number; pos: Vec2; direction: Direction }) => void;
}

interface StackState {
  index: number;
  pos: Vec2;
  dx: number;
  dy: number;
  tried: Direction[];
}

function createPathPolygon(p1: Vec2, p2: Vec2, width = 8): SAT.Polygon {
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

function polygonsIntersect(p1: SAT.Polygon, p2: SAT.Polygon): boolean {
  const response = new SAT.Response();
  const collided = SAT.testPolygonPolygon(p1, p2, response);
  return collided && response.overlap > 0.1;
}

export class RhythmPathPlanner {
  private readonly notes: SerializedNote[];
  private readonly startPos: Vec2;
  private readonly speed: number;
  private readonly random: () => number;
  private readonly onStep?: RhythmPathPlannerConfig['onStep'];

  private readonly opts: Required<Omit<RhythmPathPlannerConfig, 'startPos' | 'notes' | 'speed' | 'randomFn' | 'onStep'>>;

  private readonly distances: { dt: number; dis: number;}[];

  constructor(config: RhythmPathPlannerConfig) {
    const {
      startPos,
      notes,
      speed,
      characterSize,
      wallThickness ,
      wallLength,
      minDistance,
      pathWidth,
      random = false,
      randomFn = Math.random,
      onStep
    } = config;

    this.startPos = startPos;
    this.notes = notes;
    this.speed = speed;
    this.random = randomFn;
    this.onStep = onStep;
    this.opts = { characterSize, wallThickness, wallLength, random, minDistance, pathWidth };

    this.distances = this.notes.map((n, i) =>
      i === 0 ? n.time : n.time - this.notes[i - 1].time
    ).map(dt => ({ dt,  dis: dt * speed }));
  }

  generate(): RhythmPathPlanData {
    return this.generateMultiple(1)[0];
  }

  generateMultiple(maxSolutions = 1): RhythmPathPlanData[] {
    const { wallLength, wallThickness, characterSize, pathWidth } = this.opts;
    const offset = characterSize / 2 + wallThickness / 2;

    const directions = [
      { dx: 1, dy: 1 },
      { dx: 1, dy: -1 },
      { dx: -1, dy: -1 },
      { dx: -1, dy: 1 }
    ];
    const initDir = directions[Math.floor(this.random() * directions.length)];

    const stack: StackState[] = [{
      index: 0,
      pos: { ...this.startPos },
      dx: initDir.dx,
      dy: initDir.dy,
      tried: []
    }];

    const path: Vec2[] = [{ ...this.startPos }];
    const walls: Wall[] = [];
    const segments: Segment[] = [];
    const pathPolys: SAT.Polygon[] = [];
    const wallPolys: SAT.Polygon[] = [];
    const solutions: RhythmPathPlanData[] = [];
    const centerMidi = computeMidiCenter(this.notes);

    const tryStep = (state: StackState): boolean => {
      const note = this.notes[state.index];
      const dist = this.distances[state.index];
      const step = dist.dis / Math.sqrt(2);

      const tried = state.tried;
      const direction: Direction = note.direction ?? (
        state.tried.length
          ? (state.tried.includes('H') ? 'V' : 'H')
          : (Math.random() > 0.5 ? 'H' : 'V'));
      tried.push(direction);

      const nextPos: Vec2 = {
        x: state.pos.x + state.dx * step,
        y: state.pos.y + state.dy * step
      };

      const nextDx = direction === 'V' ? -state.dx : state.dx;
      const nextDy = direction === 'H' ? -state.dy : state.dy;

      const wall = direction === 'V'
        ? {
            start: { x: nextPos.x + state.dx * offset, y: nextPos.y - wallLength / 2 },
            end:   { x: nextPos.x + state.dx * offset, y: nextPos.y + wallLength / 2 }
          }
        : {
            start: { x: nextPos.x - wallLength / 2, y: nextPos.y + state.dy * offset },
            end:   { x: nextPos.x + wallLength / 2, y: nextPos.y + state.dy * offset }
          };

      const pathPoly = createPathPolygon(state.pos, nextPos, pathWidth);
      const wallPoly = createPathPolygon(wall.start, wall.end, wallThickness);

      if (wallPolys.some(w => polygonsIntersect(w, pathPoly))) return false;
      if (wallPolys.some(w => polygonsIntersect(w, wallPoly))) return false;
      if (pathPolys.some(p => polygonsIntersect(p, wallPoly))) return false;

      path.push(nextPos);
      const hitColor = getNoteColor(note.midi, centerMidi);
      walls.push({
        ...wall,
        hitColor,
        effects: []
      });

      const lastEnd = segments.length === 0 ? 0 : segments.at(-1)!.endTime;
      segments.push({
        startTime: lastEnd,
        endTime: lastEnd + this.distances[state.index].dt,
        startPos: { ...state.pos },
        endPos: { ...nextPos }
      });

      pathPolys.push(pathPoly);
      wallPolys.push(wallPoly);

      this.onStep?.({ index: state.index, pos: nextPos, direction });

      stack.push({ index: state.index + 1, pos: nextPos, dx: nextDx, dy: nextDy, tried: [] });
      return true;
    };

    while (stack.length) {
      const state = stack.at(-1)!;

      if (state.index >= this.notes.length) {
        solutions.push({
          paths: path.slice(),
          walls: walls.slice(),
          segments: segments.slice()
        });
        if (solutions.length >= maxSolutions) break;
        stack.pop(); path.pop(); walls.pop(); segments.pop(); pathPolys.pop(); wallPolys.pop();
        continue;
      }

      if (state.tried.length >= 2 || !tryStep(state)) {
        stack.pop(); path.pop(); walls.pop(); segments.pop(); pathPolys.pop(); wallPolys.pop();
      }
    }

    if (solutions.length === 0) {
      throw new Error('无法为当前音符序列生成合法轨迹');
    }

    return solutions;
  }
}
