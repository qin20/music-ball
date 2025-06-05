# 🎵 听歌识曲项目对话记录与技术日志

## 🗂 项目概述
本项目旨在开发一个简洁而节奏感强的“听歌识曲”风格应用，核心思路是将 MIDI 音乐转化为简化的节奏化金属敲击音频。

---

## 📌 用户目标
- 从 MIDI 文件中提取主旋律音符；
- 用音调映射到类似“小球落在金属面”那样的清脆音效；
- 控制节奏难度，让用户“模糊”听出旋律。

---

## ⚙️ 实现功能
### ✅ 1. 主函数
- `midi_to_ballstyle_audio(midi_path)`
- 自动识别主旋律轨道
- 支持叠加背景轨道并控制音量

### ✅ 2. 音效生成
- `generate_metal_click(freq, duration)`
- 使用 harmonic weights 合成泛音结构
- 加入指数衰减或 ADSR 包络

### ✅ 3. 难度控制
- `set_difficulty_level(level: int)`
  - 控制 DIFFICULTY, PITCH_JITTER, PITCH_QUANTIZATION
  - 提供等级 1~10 的预设调制强度组合

### ✅ 4. 音高量化预设
- `set_quantized_scale(preset_name: str)`
  - 预设：`C_major`, `A_minor`, `single_C`, `pentatonic_C`, `random_triad`

---

## 🧪 配置参数示例
| 参数名 | 说明 | 示例值 |
|--------|------|--------|
| `SAMPLE_RATE` | 采样率 | `44100` |
| `MAX_NOTE_DURATION` | 单个音符最大持续时间 | `1.5` |
| `ENVELOPE_DECAY` | 衰减速率 | `5.0` |
| `HARMONIC_WEIGHTS` | 泛音比重 | `[0.6, 0.3, 0.1]` |
| `BACKGROUND_VOLUME` | 背景轨道音量 | `0.3` |
| `DIFFICULTY` | 音调偏移程度 | `0.0 ~ 1.0` |
| `PITCH_JITTER` | 音高扰动 | `0.0 ~ 0.5` |
| `PITCH_QUANTIZATION` | 是否启用量化 | `True / False` |

---

## 🧾 示例调用
```python
set_difficulty_level(7)
set_quantized_scale("pentatonic_C")
midi_to_ballstyle_audio("midis/example.mid")
```

---

## 💬 部分历史对话摘录
```
用户：我想做一个听歌识曲的app，输入midi，转成节奏简化音频。
系统：支持！将主旋律提取并映射为金属风格的音效。
用户：希望增加难度等级，调整旋律识别感。
系统：已加入 DIFFICULTY 等参数和一键设置函数。
用户：能导出整个对话记录吗？
系统：现在为您整理中...
```

---

## ✅ 状态总结
- [x] 节奏简化处理逻辑完成
- [x] 可调难度与音高扰动
- [x] 可选固定音阶映射
- [x] 支持低通滤波（可拓展）
- [ ] 动画逻辑尚未集成（后续目标）

---

Generated on: 2025-05-14 10:46:27
