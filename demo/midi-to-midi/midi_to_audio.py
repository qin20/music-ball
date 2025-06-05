# -*- coding: utf-8 -*-
"""
🎼 Ballstyle MIDI Synthesizer - 技术说明文档

本项目旨在将 MIDI 文件主旋律轨道转换为节奏感清晰的点击音效音频，
支持多种风格（如金属叮音、水滴声、颤音铃、正弦波等）。每种风格输出：

1. 基于 notes 数据合成的风格音频（.wav）
2. 基于 notes 构造的新 MIDI 文件（.mid）
3. 新 MIDI 再合成得到的验证音频（_verify.wav）

应用场景：音乐可视化、节奏游戏、听歌识曲等。

-------------------------
⚙️ 配置参数一览表：
-------------------------
- SAMPLE_RATE: 音频采样率（例：44100）
- MAX_NOTE_DURATION: 单音最大持续时间（单位：秒）
- ENVELOPE_DECAY: 音量衰减指数（如 5.0）
- HARMONIC_WEIGHTS: 基频与泛音混合权重
- BACKGROUND_VOLUME: 非主旋律轨道的音量（0~1）
- DIFFICULTY: 识曲难度系数（旋律越弱节奏越强）
- PITCH_JITTER: 音高扰动范围（增加识曲难度）
- PITCH_QUANTIZATION: 是否启用音阶量化
- QUANTIZED_PITCHES: 音阶量化的 MIDI 音高集合

-------------------------
🧠 核心功能模块概览：
-------------------------
- set_difficulty_level(level): 设置识曲难度
- set_quantized_scale(preset): 预设音阶量化（五声音阶/C大调等）
- generate_metal_click(): 合成金属叮音
- generate_sine_tone(): 合成干净的正弦波
- generate_water_drop(): 合成水滴咚咚声
- generate_tibetan_bell(): 合成颤音铜铃
- build_custom_midi(note_data): 根据 note 数据生成 MIDI
- synthesize_audio_from_midi(): MIDI 转音频
- midi_to_ballstyle_audio(): 核心入口，生成各种风格音频、MIDI 及验证音频

-------------------------
🛠 开发实现关键摘要：
-------------------------
- ✅ 自动识别主旋律轨道
- ✅ 多种音效风格合成器（金属、水滴、铜铃、正弦波）
- ✅ 加入难度系数（扰动+音阶量化）
- ✅ 支持 set_difficulty_level() 和 set_quantized_scale()
- ✅ 输出风格音频、重构 MIDI 与验证用 _verify 音频
- ✅ 保证文件命名唯一，方便对比测试
- ✅ 参数与模块注释完备，利于开源维护

-------------------------
🧪 输出示例结构：
-------------------------
midis/
├── 飘雪-陳慧嫻.mid
└── out/
    ├── 飘雪-陳慧嫻_2025-05-15_13-20-00_metal.wav
    ├── 飘雪-陳慧嫻_2025-05-15_13-20-00_metal.mid
    ├── 飘雪-陳慧嫻_2025-05-15_13-20-00_metal_verify.wav
    └── ...（其他风格类推）

-------------------------
如需扩展支持更多风格、批量导入 MIDI 或可视化功能，可在此结构上继续拓展。
"""


import numpy as np
import soundfile as sf
import pretty_midi
import os
from datetime import datetime

# =========================
# ⚙️ 配置参数（统一入口）
# =========================

SAMPLE_RATE = 44100
MAX_NOTE_DURATION = 1.5
ENVELOPE_DECAY = 5.0
HARMONIC_WEIGHTS = [0.6, 0.3, 0.1]
BACKGROUND_VOLUME = 0
DIFFICULTY = 0.0
PITCH_JITTER = 0.0
PITCH_QUANTIZATION = False
QUANTIZED_PITCHES = [60, 64, 67]


# =========================
# 🌹 一键设置难度级别（1 ~ 10）
# =========================
def set_difficulty_level(level: int):
    global DIFFICULTY, PITCH_JITTER, PITCH_QUANTIZATION
    table = [
        (0.0, 0.0, False),
        (0.1, 0.05, False),
        (0.2, 0.10, False),
        (0.3, 0.15, False),
        (0.5, 0.20, False),
        (0.6, 0.25, True),
        (0.7, 0.30, True),
        (0.8, 0.35, True),
        (0.9, 0.40, True),
        (1.0, 0.50, True),
    ]
    level = max(1, min(level, 10))
    DIFFICULTY, PITCH_JITTER, PITCH_QUANTIZATION = table[level - 1]
    print(f"🌹 已设置难度级别 {level}: DIFFICULTY={DIFFICULTY}, JITTER={PITCH_JITTER}, QUANTIZE={PITCH_QUANTIZATION}")

# =========================
# ✨ 预设音阶量化表
# =========================
def set_quantized_scale(preset_name: str):
    global QUANTIZED_PITCHES
    presets = {
        "C_major": [60, 62, 64, 65, 67, 69, 71],
        "A_minor": [57, 59, 60, 62, 64, 65, 67],
        "single_C": [60],
        "pentatonic_C": [60, 62, 64, 67, 69],
        "random_triad": list(np.random.choice(range(48, 72), 3, replace=False))
    }
    if preset_name not in presets:
        raise ValueError(f"Unknown preset: {preset_name}")
    QUANTIZED_PITCHES = presets[preset_name]
    print(f"🔹 已设置量化音阶: {preset_name} -> {QUANTIZED_PITCHES}")

# =========================
# 🔊 多种风格音符生成器
# =========================
def generate_metal_click(frequency, duration, sample_rate=SAMPLE_RATE):
    t = np.linspace(0, duration, int(sample_rate * duration), False)
    wave = sum(weight * np.sin(2 * np.pi * (i + 1) * frequency * t)
               for i, weight in enumerate(HARMONIC_WEIGHTS))
    envelope = np.exp(-ENVELOPE_DECAY * t)
    return wave * envelope

def generate_sine_tone(frequency, duration, sample_rate=SAMPLE_RATE):
    t = np.linspace(0, duration, int(sample_rate * duration), False)
    wave = np.sin(2 * np.pi * frequency * t)
    envelope = np.exp(-ENVELOPE_DECAY * t)
    return wave * envelope

def generate_water_drop(frequency, duration, sample_rate=SAMPLE_RATE):
    t = np.linspace(0, duration, int(sample_rate * duration), False)
    wave = np.sin(2 * np.pi * frequency * t) * (1 - t / duration) ** 2
    envelope = np.exp(-10 * t)
    return wave * envelope

def generate_tibetan_bell(frequency, duration, sample_rate=SAMPLE_RATE):
    t = np.linspace(0, duration, int(sample_rate * duration), False)
    harmonics = [1.0, 1.48, 1.94, 2.63]
    weights = [0.7, 0.2, 0.07, 0.03]
    wave = sum(w * np.sin(2 * np.pi * frequency * h * t) for w, h in zip(weights, harmonics))
    envelope = np.exp(-2.5 * t)
    return wave * envelope

def build_custom_midi(note_data, sample_rate=SAMPLE_RATE):
    midi = pretty_midi.PrettyMIDI()
    instrument = pretty_midi.Instrument(program=0)
    for start, end, pitch, volume in note_data:
        velocity = int(volume * 100)
        note = pretty_midi.Note(
            velocity=velocity,
            pitch=int(round(pitch)),
            start=start,
            end=end
        )
        instrument.notes.append(note)
    midi.instruments.append(instrument)
    return midi

# 🔁 工具函数：将 MIDI 转换为音频

def synthesize_audio_from_midi(midi_obj, synth_func, sample_rate=SAMPLE_RATE):
    note_data = []
    for inst in midi_obj.instruments:
        for note in inst.notes:
            note_data.append((note.start, note.end, note.pitch, 1.0))

    total_duration = max(end for start, end, _, _ in note_data) + 1.0
    total_samples = int(sample_rate * total_duration)
    audio = np.zeros(total_samples, dtype=np.float32)

    for start, end, pitch, volume in note_data:
        duration = end - start
        start_sample = int(start * sample_rate)
        end_sample = start_sample + int(duration * sample_rate)

        freq = 440.0 * (2 ** ((pitch - 69) / 12))
        wave = synth_func(freq, duration, sample_rate) * volume
        audio[start_sample:end_sample] += wave[:end_sample - start_sample]

    return np.clip(audio, -1.0, 1.0)

# =========================
# 🎼 MIDI -> 多风格风格音频生成器
# =========================
def midi_to_ballstyle_audio(midi_path, sample_rate=SAMPLE_RATE):
    styles = {
        "metal": generate_metal_click,
        "sine": generate_sine_tone,
        "water": generate_water_drop,
        "bell": generate_tibetan_bell
    }

    original_midi = pretty_midi.PrettyMIDI(midi_path)
    main_track_idx = max(
        ((i, len(inst.notes)) for i, inst in enumerate(original_midi.instruments) if not inst.is_drum),
        key=lambda x: x[1],
        default=(None, 0)
    )[0]
    if main_track_idx is None:
        raise ValueError("未找到非打击乐轨道。")

    print(f"🎯 识别到主旋律轨道: {main_track_idx} ({original_midi.instruments[main_track_idx].name})")
    print(f"🧪 使用难度设置：DIFFICULTY={DIFFICULTY}, JITTER={PITCH_JITTER}, QUANTIZE={PITCH_QUANTIZATION}")

    raw_note_data = []
    for i, inst in enumerate(original_midi.instruments):
        volume = 1.0 if i == main_track_idx else BACKGROUND_VOLUME
        for note in inst.notes:
            raw_note_data.append((note.start, note.end, note.pitch, volume))

    if not raw_note_data:
        raise ValueError("未检测到任何音符。请检查 MIDI 文件。")

    # 💡 对所有风格统一生成 note_data
    note_data = []
    for start, end, pitch, volume in raw_note_data:
        duration = min(end - start, MAX_NOTE_DURATION)

        neutral_pitch = 60
        effective_pitch = pitch * (1 - DIFFICULTY) + neutral_pitch * DIFFICULTY
        jitter = np.random.uniform(-0.5, 0.5) * PITCH_JITTER
        effective_pitch += jitter

        if PITCH_QUANTIZATION:
            effective_pitch = min(QUANTIZED_PITCHES, key=lambda x: abs(x - effective_pitch))

        note_data.append((start, start + duration, effective_pitch, volume))

    base_dir = os.path.dirname(midi_path)
    base_name = os.path.splitext(os.path.basename(midi_path))[0]
    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    output_dir = os.path.join(base_dir, "out")
    os.makedirs(output_dir, exist_ok=True)

    # ✅ 保存唯一 MIDI 文件
    new_midi = build_custom_midi(note_data, sample_rate)
    output_mid = os.path.join(output_dir, f"{base_name}_{timestamp}.mid")
    new_midi.write(output_mid)
    print(f"📁 已保存统一 MIDI 文件：{output_mid}")

    # 🎧 每种音效风格生成一个音频文件
    for style_name, synth_func in styles.items():
        audio = synthesize_audio_from_midi(new_midi, synth_func, sample_rate)
        output_wav = os.path.join(output_dir, f"{base_name}_{timestamp}_{style_name}.wav")
        sf.write(output_wav, audio, sample_rate)
        print(f"✅ 生成完成：{output_wav}")

# =========================
# ▶️ 示例用法
# =========================
if __name__ == "__main__":
    set_difficulty_level(1)
    set_quantized_scale("pentatonic_C")
    midi_to_ballstyle_audio(
        midi_path="E:/dev/music-ball/midi-to-midi/midis/timeback.mid"
    )
