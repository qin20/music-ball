# 🎼 Ballstyle MIDI Synthesizer - 技术说明文档

---

## 📘 项目简介

本项目旨在将 MIDI 文件主旋律轨道转换为节奏感清晰的点击音效音频，支持多种风格（如金属叮音、水滴声、颤音铃、正弦波等）。此外，为保证转换的正确性，每种风格都会生成：

1. 基于音符数据直接生成的音频
2. 音符构造的新 MIDI 文件
3. 该新 MIDI 重新合成的音频（用于验证）

适用于音乐可视化、节奏游戏、听歌识曲等应用。

---

## ⚙️ 配置参数一览表

| 参数名                 | 类型         | 说明                   | 示例值              |
| ------------------- | ---------- | -------------------- | ---------------- |
| SAMPLE\_RATE        | int        | 音频采样率                | 44100            |
| MAX\_NOTE\_DURATION | float      | 单个音符的最大持续时间（秒）       | 1.5              |
| ENVELOPE\_DECAY     | float      | 声音衰减速率（指数型）          | 5.0              |
| HARMONIC\_WEIGHTS   | list       | 基频与泛音的合成权重，用于风格音效    | \[0.6, 0.3, 0.1] |
| BACKGROUND\_VOLUME  | float      | 非主旋律轨道的音量（0\~1）      | 0.3              |
| DIFFICULTY          | float      | 难度等级（旋律越弱，节奏越强）      | 0.0 \~ 1.0       |
| PITCH\_JITTER       | float      | 音高扰动范围，用于增加识曲难度      | 0.0 \~ 0.5       |
| PITCH\_QUANTIZATION | bool       | 是否启用音高量化至预设音阶        | True / False     |
| QUANTIZED\_PITCHES  | list\[int] | 量化音阶 MIDI 值列表（如五声音阶） | \[60, 64, 67]    |

---

## 🧠 功能结构模块描述

| 函数名                            | 功能描述                                    |
| ------------------------------ | --------------------------------------- |
| `set_difficulty_level(level)`  | 设置识曲难度等级（影响 DIFFICULTY/JITTER/QUANTIZE） |
| `set_quantized_scale(preset)`  | 选择预设音阶用于量化（如 pentatonic、C\_major 等）     |
| `generate_metal_click()`       | 合成金属叮风格音效                               |
| `generate_sine_tone()`         | 合成正弦波音效（干净自然）                           |
| `generate_water_drop()`        | 合成水滴咚咚声音效                               |
| `generate_tibetan_bell()`      | 合成颤音铜铃风格音效                              |
| `build_custom_midi(note_data)` | 根据处理后的 notes 构造新的 PrettyMIDI 对象         |
| `synthesize_audio_from_midi()` | 将任意 MIDI 文件中的 note 转换为音频                |
| `midi_to_ballstyle_audio()`    | 核心转换函数，生成每种风格的音频、MIDI 与验证音频             |

---

## 🛠 开发过程摘要摘录

以下是部分开发过程中实现的关键点：

✅ 实现从 MIDI 中自动识别主旋律轨道
✅ 添加风格参数，实现多种音效合成器（metal、water、bell、sine）
✅ 引入音高扰动（jitter）与量化（quantize）机制用于控制听歌识曲的难度
✅ 添加 set_difficulty_level() 快捷控制函数
✅ 添加 set_quantized_scale() 音阶映射预设（支持五声音阶、C大调等）
✅ 生成多个 .wav 文件用于不同风格输出，保留节奏感
✅ 完善参数注释和模块注释，提升项目可维护性与开源价值

## 🛠 开发过程关键改动摘要

以下是本次对话中根据用户需求实现的关键逻辑增强：

### ✅ 核心需求改动

* 将 `midi_to_ballstyle_audio` 中的风格音频不再直接复用原始 MIDI，而是根据 notes 重构 MIDI。
* 为每种风格生成的 `.mid` 文件，额外合成为一个 `_verify.wav` 文件，用于验证风格音频与 MIDI 的一致性。
* 保证每种输出文件命名唯一，便于后续对比与测试。

### 💬 对话摘录摘要

> **用户：** 每一种风格的 midi 文件都应该根据对应的新的 notes 来生成，与每种风格的 audio 相对应，不能直接使用 midi.write。

> **用户：** 请再将新的 midi 转成音频，不能与新的 audio 重名，方便我验证 midi 转成的音频 和 notes 生成的音频是否一致，可以验证 midi 的正确性。

> **助手：** 每种风格现在不仅生成风格音频和对应的 MIDI 文件，还会将该 MIDI 文件重新合成为一个 `_verify.wav` 音频，用于验证 notes 与 MIDI 是否一致。

---

## 🧪 输出示例结构

```bash
midis/
├── 飘雪-陳慧嫻.mid
└── out/
    ├── 飘雪-陳慧嫻_2025-05-15_13-20-00_metal.wav
    ├── 飘雪-陳慧嫻_2025-05-15_13-20-00_metal.mid
    ├── 飘雪-陳慧嫻_2025-05-15_13-20-00_metal_verify.wav
    └── ... 其他风格类似
```

---

如需扩展支持更多风格音效、批量导入 MIDI、添加可视化功能等，可基于当前结构继续开发。
