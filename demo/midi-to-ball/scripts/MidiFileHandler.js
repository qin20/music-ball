/**
 * ============================================================
 * 🎵 MidiFileHandler.js
 * ============================================================
 *
 * 1. 📌 功能简介
 * ------------------------------------------------------------
 * 本模块封装了一个用于处理单个 MIDI 文件的类（MidiFileHandler），
 * 使用 @tonejs/midi 解析后统一输出结构化节奏事件，支持动画播放控制、
 * 时间轴渲染、MIDI 音高信息（英文名 + 固定唱名）。
 *
 * 主要用途包括：可视化时间轴绘制、手动节奏调度播放、节奏动画等。
 *
 *
 * 2. ⚙️ 配置参数及说明
 * ------------------------------------------------------------
 * | 参数名     | 类型    | 说明                                     |
 * |------------|---------|------------------------------------------|
 * | path       | string  | MIDI 文件的路径，构造时传入              |
 * | limit      | number  | （可选）限制返回的音符数量，默认不限     |
 *
 *
 * 3. 🧱 模块结构与方法说明
 * ------------------------------------------------------------
 * class MidiFileHandler
 * ├─ constructor(path)         // 传入 MIDI 文件路径初始化
 * ├─ async load()              // 加载并解析 MIDI 文件（仅第一个轨道）
 * └─ getEvents(limit?)         // 返回结构化的节奏事件列表（单位毫秒）
 *
 * 函数：midiToNames(midi)
 * - 将 MIDI 音高（如 64）转换为：
 *     pitch:  "E4"
 *     solfege: "mi"
 *
 *
 * 4. 🧠 开发摘要 & 对话摘录
 * ------------------------------------------------------------
 * ✅ 用户意图：
 *   - 只使用第一个轨道
 *   - 只需要每个音符的真实时间（秒 → 毫秒）
 *   - 用于 canvas/svg 动画播放、音符可视化
 *
 * ✅ 核心设计：
 *   - 封装成类，支持后续扩展更多方法（如 getBPM, getNotes）
 *   - 返回结构统一如下：
 *     {
 *       delta:    与上一个音符的间隔时间（毫秒）
 *       time:     音符开始时间（毫秒）
 *       midi:     MIDI 音高
 *       pitch:    如 "E4"
 *       solfege:  如 "mi"
 *       duration: 持续时长（毫秒）
 *       velocity: 力度（0~1）
 *     }
 *
 * ✅ 用例（在 HTML 中使用）：
 *   const midi = new MidiFileHandler('/path/to/file.mid');
 *   await midi.load();
 *   const events = midi.getEvents(30);  // 前 30 个音符节奏事件
 *
 * ------------------------------------------------------------
 * 📁 依赖：@tonejs/midi
 * 🔄 最后更新：由 ChatGPT 与用户清缘合作设计，2025-05-15
 * ============================================================
 */

import { Midi } from 'https://cdn.jsdelivr.net/npm/@tonejs/midi@2.0.28/+esm';

// MIDI 音高转换为音名 + 唱名
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const SOLFEGE_MAP = {
  'C': 'do', 'C#': 'do#', 'D': 're', 'D#': 're#',
  'E': 'mi', 'F': 'fa', 'F#': 'fa#', 'G': 'sol',
  'G#': 'sol#', 'A': 'la', 'A#': 'la#', 'B': 'ti'
};

// MIDI 音高 → { pitch: 'E4', solfege: 'mi' }
function midiToNames(midi) {
  const note = NOTE_NAMES[midi % 12];
  const octave = Math.floor(midi / 12) - 1;
  return {
    pitch: `${note}${octave}`,
    solfege: SOLFEGE_MAP[note] || '?'
  };
}

/**
 * MidiFileHandler - 解析并提取 MIDI 文件节奏信息（以毫秒为单位）
 */
export class MidiFileHandler {
  constructor(path) {
    this.path = path;
    this.midi = null;
    this.notes = [];
  }

  /**
   * 加载并解析 MIDI 文件（只处理第一个轨道）
   */
  async load() {
    const response = await fetch(this.path);
    if (!response.ok) throw new Error(`无法加载 MIDI 文件: ${response.statusText}`);
    const arrayBuffer = await response.arrayBuffer();
    this.midi = new Midi(arrayBuffer);
    this.notes = this.midi.tracks[0]?.notes || [];
  }

  getEvents(startIndex = 0, endIndex = null) {
    const slice = this.notes.slice(startIndex, endIndex ?? undefined);
    if (!slice.length) return [];

    // ✅ 限制第一个音符不能晚于 500ms
    const timeShift = Math.max(0, slice[0].time * 1000 - 500) / 1000; // 单位秒

    return slice.map((note, i) => {
      const adjustedTime = note.time - timeShift; // 单位秒
      const time = adjustedTime * 1000;
      const duration = note.duration * 1000;
      const { pitch, solfege } = midiToNames(note.midi);

      const prevNote = i === 0 ? this.notes[startIndex - 1] : slice[i - 1];
      const prevTime = prevNote ? (prevNote.time - timeShift) * 1000 : 0;
      const delta = time - prevTime;

      return {
        delta,
        time,
        midi: note.midi,
        pitch,
        solfege,
        duration,
        velocity: note.velocity
      };
    });
  }

  _mergeGroup(group, prevEvent) {
    const first = group[0];
    const time = first.time;
    const duration = group.reduce((sum, n) => sum + n.duration, 0);
    const midi = first.midi;
    const velocity = Math.max(...group.map(n => n.velocity));
    const { pitch, solfege } = midiToNames(midi);
    const delta = prevEvent ? time - prevEvent.time : time;

    return {
      delta,
      time,
      midi,
      pitch,
      solfege,
      duration,
      velocity
    };
  }
}
