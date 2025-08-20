export const MidiPlayerPresets = {
  default: {
    transpose: 12,
    harmonicity: 10,
    modulationIndex: 0.001,
    attack: 0.01,
    sustain: 0.2,
    decay: 0.2,
    release: 1,
  },
  defaultFM: {
    transpose: 6,
    harmonicity: 0.1,
    modulationIndex: 0,
    attack: 0.001,
    sustain: 0,
    decay: 1,
    release: 0.01,
  },
  default_normal: {
    transpose: 0,
    harmonicity: 0.1,
    modulationIndex: 0,
    attack: 0.001,
    sustain: 0.001,
    decay: 1,
    release: 2,
  },
  /** 明亮的金属打击，适合高音节奏点击，音色清脆有弹性 */
  brightMetalHit: {
    transpose: 12,
    harmonicity: 2.5,
    modulationIndex: 6,
    attack: 0.005,
    sustain: 0.2,
    decay: 0.15,
    release: 0.4
  },

  /** 深沉沉稳的低频敲击，适合模拟重球撞击地面，厚重自然 */
  deepImpact: {
    transpose: 0,
    harmonicity: 1.2,
    modulationIndex: 8,
    attack: 0.01,
    sustain: 0.15,
    decay: 0.25,
    release: 0.5
  },

  /** 高音弹珠撞击声，瞬时明亮，适合快速节奏或轻盈碰撞 */
  glassPing: {
    transpose: 24,
    harmonicity: 4,
    modulationIndex: 10,
    attack: 0.002,
    sustain: 0.1,
    decay: 0.1,
    release: 0.3
  },

  /** 带空间感的柔性金属敲击，尾音拖出略带铃铛感，适合氛围节奏 */
  ambientBell: {
    transpose: 12,
    harmonicity: 6,
    modulationIndex: 3,
    attack: 0.02,
    sustain: 0.25,
    decay: 0.3,
    release: 0.6
  },

  /** 强烈的电子感撞击音，短促、带颗粒感，适合节奏型机关撞击 */
  sciFiClick: {
    transpose: 12,
    harmonicity: 5,
    modulationIndex: 15,
    attack: 0.001,
    sustain: 0.1,
    decay: 0.05,
    release: 0.25
  }
};
