import numpy as np
import soundfile as sf
import pretty_midi
import os
from datetime import datetime


# =========================
# ⚙️ 配置参数（统一入口）
# =========================

# SAMPLE_RATE: 音频采样率（单位：Hz）
# 常用值：22050（低质量），44100（CD标准），48000（视频标准），96000（高分辨率）
SAMPLE_RATE = 44100  # 推荐：44100 或 48000

# MAX_NOTE_DURATION: 每个音符的最长持续时间（单位：秒）
# 范围建议：0.1 ~ 3.0，太短听不清，太长会混响重叠
MAX_NOTE_DURATION = 1.5

# ENVELOPE_DECAY: 指数衰减速度（无单位）
# 范围建议：1.0 ~ 10.0，值越大声音越短促干脆，值越小尾音越长
ENVELOPE_DECAY = 5.0

# HARMONIC_WEIGHTS: 泛音权重列表 [基频, 2倍频, 3倍频, ...]
# 建议权重递减，总和建议 ≤ 1.5；越多泛音越亮，金属感更强
HARMONIC_WEIGHTS = [0.6, 0.3, 0.1]

# BACKGROUND_VOLUME: 非主旋律轨道的音量系数（0~1）
# 设置为 0 表示完全静音，仅播放主旋律；设置为 1 表示与主旋律同等响度
BACKGROUND_VOLUME = 0.3

# DIFFICULTY: 音高难度系数（0~1）  0 = 保留旋律，1 = 完全隐藏旋律，仅保留节奏
DIFFICULTY = 0.0

# PITCH_JITTER: 音高扰动强度（0~1） ±0.5 半音以内浮动
PITCH_JITTER = 0.0

# PITCH_QUANTIZATION: 是否将音高映射到固定音阶
PITCH_QUANTIZATION = False
QUANTIZED_PITCHES = [60, 64, 67] # C, E, G


# =========================
# 🎚 一键设置难度等级（1 ~ 10）
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
    level = max(1, min(level, 10))  # 保证范围在 1~10
    DIFFICULTY, PITCH_JITTER, PITCH_QUANTIZATION = table[level - 1]
    print(f"🎚 已设置难度等级 {level}: DIFFICULTY={DIFFICULTY}, JITTER={PITCH_JITTER}, QUANTIZE={PITCH_QUANTIZATION}")

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
# 🔊 小球撞击音生成器
# =========================
def generate_metal_click(frequency, duration, sample_rate=SAMPLE_RATE):
    t = np.linspace(0, duration, int(sample_rate * duration), False)
    wave = sum(
        weight * np.sin(2 * np.pi * (i + 1) * frequency * t)
        for i, weight in enumerate(HARMONIC_WEIGHTS)
    )
    envelope = np.exp(-ENVELOPE_DECAY * t)
    return wave * envelope

# =========================
# 🎼 MIDI -> 小球撞击风格音频生成器
# =========================
def midi_to_ballstyle_audio(midi_path, sample_rate=SAMPLE_RATE):
    midi = pretty_midi.PrettyMIDI(midi_path)
    # 找到非打击乐中音符最多的轨道作为主旋律
    main_track_idx = None
    max_note_count = 0
    for i, inst in enumerate(midi.instruments):
        if inst.is_drum:
            continue
        if len(inst.notes) > max_note_count:
            max_note_count = len(inst.notes)
            main_track_idx = i
    if main_track_idx is None:
        raise ValueError("未找到非打击乐轨道。")
    print(f"🎯 识别到主旋律轨道: {main_track_idx} ({midi.instruments[main_track_idx].name})")
    print(f"🧪 使用难度设置：DIFFICULTY={DIFFICULTY}, JITTER={PITCH_JITTER}, QUANTIZE={PITCH_QUANTIZATION}")

    # 收集所有音符 + 所属轨道音量
    note_data = []  # (start, end, pitch, volume)
    for i, inst in enumerate(midi.instruments):
        volume = 1.0 if i == main_track_idx else BACKGROUND_VOLUME
        for note in inst.notes:
            note_data.append((note.start, note.end, note.pitch, volume))
    if not note_data:
        raise ValueError("未检测到任何音符。请检查 MIDI 文件。")

    # 计算总时长并初始化空音轨
    total_duration = max(end for start, end, _, _ in note_data) + 1.0
    total_samples = int(sample_rate * total_duration)
    audio = np.zeros(total_samples, dtype=np.float32)

    # 合成每个音符并叠加进总音轨
    for start, end, pitch, volume in note_data:
        duration = min(end - start, MAX_NOTE_DURATION)
        start_sample = int(start * sample_rate)
        end_sample = start_sample + int(duration * sample_rate)

        # 处理音高扰动与难度影响
        neutral_pitch = 60  # C4
        effective_pitch = pitch * (1 - DIFFICULTY) + neutral_pitch * DIFFICULTY
        jitter = np.random.uniform(-0.5, 0.5) * PITCH_JITTER
        effective_pitch += jitter

        if PITCH_QUANTIZATION:
            effective_pitch = min(QUANTIZED_PITCHES, key=lambda x: abs(x - effective_pitch))

        freq = 440.0 * (2 ** ((effective_pitch - 69) / 12))

        # 生成音符波形（含音量控制）
        wave = generate_metal_click(freq, duration, sample_rate) * volume
        audio[start_sample:end_sample] += wave[:end_sample - start_sample]

    audio = np.clip(audio, -1.0, 1.0)

    # 构造输出路径
    base_dir = os.path.dirname(midi_path)
    base_name = os.path.splitext(os.path.basename(midi_path))[0]
    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    output_dir = os.path.join(base_dir, "out")
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, f"{base_name}_{timestamp}_ball.wav")

    sf.write(output_path, audio, sample_rate)
    print(f"✅ 生成完成：{output_path}")

# =========================
# ▶️ 示例用法
# =========================
if __name__ == "__main__":
    set_difficulty_level(7)
    set_quantized_scale("pentatonic_C")
    midi_to_ballstyle_audio(
        midi_path="E:/dev/music-ball/lib/midis/飘雪-陳慧嫻.mid"
    )
