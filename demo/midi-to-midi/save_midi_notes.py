import csv
from mido import MidiFile, tick2second, bpm2tempo

# MIDI 文件路径（← 修改为你自己的文件）
midi_path = r"E:\dev\music-ball\web\demo\midi-to-midi\midis\timeback.mid"

mid = MidiFile(midi_path)
ticks_per_beat = mid.ticks_per_beat

# 获取 tempo（默认 120bpm）
tempo = next(
    (msg.tempo for track in mid.tracks for msg in track if msg.type == "set_tempo"),
    bpm2tempo(120),
)

# MIDI note 数字转 note 名称（如 60 → C4）
def note_number_to_name(note_num):
    note_names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
    octave = (note_num // 12) - 1
    name = note_names[note_num % 12]
    return f"{name}{octave}"

with open("midi_notes.csv", "w", newline="", encoding="utf-8") as csvfile:
    writer = csv.writer(csvfile)
    writer.writerow(
        ["track", "abs_ticks", "seconds", "msg_type", "note", "note_name", "velocity"]
    )

    for t_idx, track in enumerate(mid.tracks):
        abs_ticks = 0
        for msg in track:
            abs_ticks += msg.time
            if msg.type in ("note_on", "note_off"):
                seconds = tick2second(abs_ticks, ticks_per_beat, tempo)
                note_name = note_number_to_name(msg.note)
                writer.writerow(
                    [
                        t_idx,
                        abs_ticks,
                        f"{seconds:.3f}",
                        msg.type,
                        msg.note,
                        note_name,
                        msg.velocity,
                    ]
                )

print("✅ 导出完成：midi_notes.csv（当前目录）")
