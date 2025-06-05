
# 🎵 midi-to-ball 节奏可视化系统

一个基于 MIDI 音符生成节奏小球路径与墙体反射动画的可视化引擎。该项目实现了小球按节奏在二维画布中反射运动、撞击墙体发光、拖尾动态绘制等功能，适用于音乐可视化、节奏教学、MIDI 分析与游戏引擎原型。

---

## 📦 项目结构

```
midi-to-ball/
├─ index.html # 主页面入口（2D Canvas）
├─ index3d.html # 预留 3D 版本入口
├─ README.md # 技术说明文档（当前文件）
├─ assets/ # 示例音频与 MIDI 资源
│ ├─ 飘雪-陳慧嫻_...sine.mid
│ └─ 飘雪-陳慧嫻_...sine.wav
└─ scripts/ # 核心模块源码
  ├─ Camera.js
  ├─ CanvasResizer.js
  ├─ MidiFileHandler.js
  ├─ Rhythm.js
  ├─ RhythmBall.js
  ├─ RhythmWalls.js
  ├─ RhythmPathPlanner.Stack.js
  └─ RhythmThemes.js
```
---

## ⚙️ 配置参数总览

以下为各主要模块中可配置的参数项（通过 `options` 传入）：

| 模块              | 参数名           | 类型     | 默认值       | 说明                                                             |
|-------------------|------------------|----------|--------------|------------------------------------------------------------------|
| RhythmWalls       | `characterSize`     | Number   | 必填         | 小球半径，决定轨迹宽度、墙体尺寸等                              |
|                   | `wallLength`     | Number   | characterSize×2 | 墙体长度（自动推导）                                             |
|                   | `wallThickness`  | Number   | characterSize/2 | 墙体线宽（自动推导）                                             |
| Rhythm            | `theme`          | String   | 'default'    | 使用的视觉风格主题                                               |
|                   | `speed`          | Number   | 0.25         | 每毫秒对应的像素位移速度（决定动画整体缩放）                   |
| Camera            | `safeMarginX`    | Number   | canvas/2     | 相机水平方向缓冲区                                               |
|                   | `safeMarginY`    | Number   | canvas/2     | 相机垂直方向缓冲区                                               |
|                   | `easing`         | Number   | 0.15         | 相机追踪缓动系数                                                 |
|                   | `zoomLevel`      | Number   | 0            | 当前缩放级别（0 表示 fit 全局路径，1 表示 100% 原始像素）      |

---

## 🧩 模块功能结构

| 文件名                      | 功能说明                                                                 |
|-----------------------------|--------------------------------------------------------------------------|
| `Rhythm.js`                 | 节奏控制主类：整合小球、墙体、相机、主题，驱动节奏动画                 |
| `RhythmBall.js`             | 小球运动模块：沿路径移动、拖尾粒子渲染                                 |
| `RhythmWalls.js`            | 墙体路径模块：轨迹规划、墙体生成、发光控制、遮罩绘制                   |
| `RhythmPathPlanner.Stack.js`| 回溯轨迹生成器：生成不穿墙轨迹并支持多方案生成                         |
| `Camera.js`                 | 缓动相机模块：目标靠近边缘时缓慢追踪移动 + 缩放控制                     |
| `RhythmThemes.js`           | 多主题系统：提供 ballStyle / wallColor / glowColor / 背景等             |
| `MidiFileHandler.js`        | MIDI 解析器：提取节奏事件（midi、pitch、delta、duration、velocity 等）|
| `CanvasResizer.js`          | 自适应 Canvas 尺寸工具                                                  |

---

## 🧠 开发过程摘要

- ✅ 最初需求：**基于 MIDI 节奏生成节奏动画**，模拟小球撞墙、发光、反射。
- ✅ 小球路径不应穿越任何墙体 → 引入 **回溯轨迹生成算法 RhythmPathPlanner**
- ✅ 添加路径遮罩功能：`drawWallMask` 将画布视为墙体，仅通道被“挖空”
- ✅ 小球运动节奏必须精确同步音符播放 → 改为 `setCurrentTime(ms)` 外部时间驱动
- ✅ 引入 `Camera` 实现镜头平滑追踪 + fit-to-path 缩放视野
- ✅ 每段路径段使用 `segments` 精确定义小球轨迹区间，便于插值/绘制
- ✅ 支持随机/多路径候选生成（用于未来扩展轨迹选择与评分）
- ✅ 所有样式与动画参数抽离至 `RhythmThemes`，便于快速切换视觉风格

---

## 🧪 示例效果（主路径）

- 小球运动遵循 45° 对角线，撞墙反射
- 每次撞墙触发墙体发光效果，发光带 easing 动画
- 拖尾粒子渐隐
- 背景为全黑，仅保留通道区域
- 支持 Tone.js 播放控制：节奏动画与音乐同步

---

## 🔧 后续可扩展方向

- [ ] 增加路径评分与选择器（如最短反射次数、最平衡轨迹等）
- [ ] 增加路径预览与“点击换轨”功能
- [ ] 支持多轨 MIDI（节奏层次展示）
- [ ] 支持 WebGL / Three.js 拓展为 3D 球体动画
- [ ] 支持路径分析图导出（SVG / JSON）

---

## 🧑‍💻 贡献者

由 [清缘](#) 与 ChatGPT 协作开发
感谢你在节奏可视化方面的创意与精细打磨 💡🎶

---
