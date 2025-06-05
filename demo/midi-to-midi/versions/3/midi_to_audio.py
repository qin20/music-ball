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

    base_dir = os.path.dirname(midi_path)
    base_name = os.path.splitext(os.path.basename(midi_path))[0]
    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    output_dir = os.path.join(base_dir, "out")
    os.makedirs(output_dir, exist_ok=True)

    for style_name, synth_func in styles.items():
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

        # 合成音频
        audio = synthesize_audio_from_midi(build_custom_midi(note_data), synth_func, sample_rate)
        output_wav = os.path.join(output_dir, f"{base_name}_{timestamp}_{style_name}.wav")
        sf.write(output_wav, audio, sample_rate)
        print(f"✅ 生成完成：{output_wav}")

        # 保存每种风格对应 MIDI
        new_midi = build_custom_midi(note_data, sample_rate)
        output_mid = os.path.join(output_dir, f"{base_name}_{timestamp}_{style_name}.mid")
        new_midi.write(output_mid)
        print(f"📁 已保存 {style_name} 风格的 MIDI 文件：{output_mid}")

        # 再将该 MIDI 转回音频供验证
        audio_from_new_midi = synthesize_audio_from_midi(new_midi, synth_func, sample_rate)
        verify_wav = os.path.join(output_dir, f"{base_name}_{timestamp}_{style_name}_verify.wav")
        sf.write(verify_wav, audio_from_new_midi, sample_rate)
        print(f"🔍 已生成验证音频：{verify_wav}")

# =========================
# ▶️ 示例用法
# =========================
if __name__ == "__main__":
    set_difficulty_level(1)
    set_quantized_scale("pentatonic_C")
    midi_to_ballstyle_audio(
        midi_path="E:/dev/music-ball/midi-to-midi/midis/飘雪-陳慧嫻.mid"
    )
