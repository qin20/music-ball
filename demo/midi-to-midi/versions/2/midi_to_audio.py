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
    level = max(1, min(level, 10))
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

    midi = pretty_midi.PrettyMIDI(midi_path)
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

    note_data = []
    for i, inst in enumerate(midi.instruments):
        volume = 1.0 if i == main_track_idx else BACKGROUND_VOLUME
        for note in inst.notes:
            note_data.append((note.start, note.end, note.pitch, volume))

    if not note_data:
        raise ValueError("未检测到任何音符。请检查 MIDI 文件。")

    base_dir = os.path.dirname(midi_path)
    base_name = os.path.splitext(os.path.basename(midi_path))[0]
    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    output_dir = os.path.join(base_dir, "out")
    os.makedirs(output_dir, exist_ok=True)

    for style_name, synth_func in styles.items():
        total_duration = max(end for start, end, _, _ in note_data) + 1.0
        total_samples = int(sample_rate * total_duration)
        audio = np.zeros(total_samples, dtype=np.float32)

        for start, end, pitch, volume in note_data:
            duration = min(end - start, MAX_NOTE_DURATION)
            start_sample = int(start * sample_rate)
            end_sample = start_sample + int(duration * sample_rate)

            neutral_pitch = 60
            effective_pitch = pitch * (1 - DIFFICULTY) + neutral_pitch * DIFFICULTY
            jitter = np.random.uniform(-0.5, 0.5) * PITCH_JITTER
            effective_pitch += jitter

            if PITCH_QUANTIZATION:
                effective_pitch = min(QUANTIZED_PITCHES, key=lambda x: abs(x - effective_pitch))

            freq = 440.0 * (2 ** ((effective_pitch - 69) / 12))
            wave = synth_func(freq, duration, sample_rate) * volume
            audio[start_sample:end_sample] += wave[:end_sample - start_sample]

        audio = np.clip(audio, -1.0, 1.0)
        output_path = os.path.join(output_dir, f"{base_name}_{timestamp}_{style_name}.wav")
        sf.write(output_path, audio, sample_rate)
        print(f"✅ 生成完成：{output_path}")

# =========================
# ▶️ 示例用法
# =========================
if __name__ == "__main__":
    set_difficulty_level(1)
    set_quantized_scale("pentatonic_C")
    midi_to_ballstyle_audio(
        midi_path="E:/dev/music-ball/lib/midis/飘雪-陳慧嫻.mid"
    )
