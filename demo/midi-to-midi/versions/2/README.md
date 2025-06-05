# 🎼 MIDI Ballstyle Synthesizer

一个将 MIDI 文件主旋律转换为节奏感清晰的“点击音效”音频的 Python 项目，支持多种合成风格（如金属叮音、水滴声、颤音铃等），适合用于音乐可视化、听音识曲、节奏类游戏等创意应用。

---

## 📘 项目简介

本项目核心功能是读取标准 .mid 文件，提取主旋律轨道，按音符时序合成金属风格的节奏音频，生成一个或多个 .wav 文件输出。支持自定义音效风格、量化音阶、音高扰动等多种参数配置，用于调节“识曲难度”。

---

## ⚙️ 配置参数一览表

| 参数名               | 类型   | 说明                                                 | 示例值                     |
|--------------------|--------|----------------------------------------------------|--------------------------|
| SAMPLE_RATE        | int    | 采样率，影响音频品质和体积                               | 44100（CD标准）             |
| MAX_NOTE_DURATION  | float  | 单个音符的最大时长（秒），防止拖音过长                         | 1.5                      |
| ENVELOPE_DECAY     | float  | 音量的指数衰减速率，模拟尾音渐隐效果                          | 5.0                      |
| HARMONIC_WEIGHTS   | list   | 基频与泛音的合成权重，决定金属感与亮度                          | [0.6, 0.3, 0.1]          |
| BACKGROUND_VOLUME  | float  | 非主旋律轨道的混响音量（0~1）                               | 0.3                      |
| DIFFICULTY         | float  | 旋律难度系数（0 保留旋律，1 仅保留节奏）                      | 0.0 ~ 1.0               |
| PITCH_JITTER       | float  | 每个音符的音高扰动程度，增加“听不出”难度                      | 0.0 ~ 0.5               |
| PITCH_QUANTIZATION | bool   | 是否将音符强制映射至限定音阶                                | True / False            |
| QUANTIZED_PITCHES  | list   | 音阶映射使用的 MIDI 音高列表（如 C 大调）                    | [60, 64, 67]            |

---

## 🔧 函数结构说明

| 函数名                   | 说明                                 |
|------------------------|------------------------------------|
| midi_to_ballstyle_audio() | 主转换函数，读取 MIDI 并生成多个风格 .wav 文件 |
| generate_metal_click()    | 金属“叮”音效合成器                        |
| generate_sine_tone()      | 简单正弦波音效（干净自然）                   |
| generate_water_drop()     | 水滴下落“咚”音效                         |
| generate_tibetan_bell()   | 模拟颤音铜铃音效                         |
| set_difficulty_level()    | 快速切换难度等级（1~10）                  |
| set_quantized_scale()     | 设置量化音阶预设（如五声音阶、C大调等）         |

---

## 🧪 使用方式示例

```python
set_difficulty_level(1)  # 设置简单难度
set_quantized_scale("pentatonic_C")  # 使用 C 五声音阶
midi_to_ballstyle_audio("midis/飘雪-陳慧嫻.mid")  # 执行转换
```

输出将在原始路径下生成 out/ 文件夹，包含多个音频风格版本：

```csharp
midis/
├── 飘雪-陳慧嫻.mid
└── out/
    ├── 飘雪-陳慧嫻_2025-05-14_13-10-00_metal.wav
    ├── 飘雪-陳慧嫻_2025-05-14_13-10-00_water.wav
    └── ...
```

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
