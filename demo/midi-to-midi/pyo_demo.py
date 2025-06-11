"""
midi_bouncy_clicks.py
播放 MIDI，每个 note → “小球撞击声”，带牆面反弹回音
"""

import numpy as np
import pygame
from mido import MidiFile
from functools import lru_cache

# ───────────────────────────────────────────────
# 1. 配置
# ───────────────────────────────────────────────
# MIDI 文件路径【请改成自己的】:
MIDI_PATH = r"E:/dev/music-ball/web/demo/midi-to-midi/midis/timeback.mid"

# 撞击音色参数
SAMPLE_RATE = 44_100
BASE_VOLUME = 0.5          # 原始击打音量
CLICK_DURATION = 0.15      # 秒；原始击打长度

# 反弹回音参数
BOUNCE_COUNT = 2           # 回声次数
BOUNCE_DELAY = 0.06        # 每次回声间隔秒
BOUNCE_DECAY = 0.45        # 每次回声音量乘衰减系数

# 音高映射：让低音提亮，高音限制，避免“嘟嘟 / 刺耳”
def midi_note_to_click_freq(note: int) -> float:
    if note >= 80:             # 过高 → 固定 700 Hz
        return 700.0
    if note < 60:              # 过低 → +12 半音再转频率
        note += 12
    # 60-79 用正常音程
    return 440.0 * 2 ** ((note - 69) / 12)

# ───────────────────────────────────────────────
# 2. 声音合成（点击 + 回音）
# ───────────────────────────────────────────────
@lru_cache(maxsize=None)
def make_click_sound(freq: float) -> pygame.mixer.Sound:
    """生成含回音的立体声音效，并缓存"""
    # 时轴
    base_len = int(SAMPLE_RATE * CLICK_DURATION)
    total_len = base_len + int(SAMPLE_RATE * BOUNCE_DELAY * BOUNCE_COUNT)
    t = np.linspace(0, CLICK_DURATION, base_len, False)

    # 原始击打音：正弦 + 指数衰减
    click = np.sin(2 * np.pi * freq * t) * np.exp(-10 * t)

    # 回音缓冲
    signal = np.zeros(total_len, dtype=np.float32)
    signal[:base_len] += click

    # 逐次加入回音
    for i in range(1, BOUNCE_COUNT + 1):
        start = int(i * BOUNCE_DELAY * SAMPLE_RATE)
        end = start + base_len
        if end > total_len: break
        signal[start:end] += click * (BOUNCE_DECAY ** i)

    # 归一化音量
    signal *= BASE_VOLUME
    # 防止溢出
    signal = np.clip(signal, -1.0, 1.0)
    pcm = (signal * 32767).astype(np.int16)

    # 复制到双声道
    stereo_pcm = np.column_stack((pcm, pcm))
    return pygame.sndarray.make_sound(stereo_pcm)

# ───────────────────────────────────────────────
# 3. 初始化 Pygame 音频
# ───────────────────────────────────────────────
pygame.init()
pygame.mixer.init(frequency=SAMPLE_RATE, size=-16, channels=2)

# ───────────────────────────────────────────────
# 4. 播放 MIDI
# ───────────────────────────────────────────────
mid = MidiFile(MIDI_PATH)
print(f"🎹 Loaded '{MIDI_PATH}'  |  ticks_per_beat={mid.ticks_per_beat}")

for msg in mid.play():        # mido 内部根据 delta-time 自动 sleep
    if msg.type == "note_on" and msg.velocity > 0:
        freq = midi_note_to_click_freq(msg.note)
        snd = make_click_sound(freq)
        # maxtime 保证回音可完整播放（总长 = CLICK_DURATION + N*DELAY）
        snd.play(maxtime=int((CLICK_DURATION + BOUNCE_DELAY * BOUNCE_COUNT) * 1000))

print("✅ Done.")
