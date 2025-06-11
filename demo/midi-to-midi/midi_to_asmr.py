import mido
mid = mido.MidiFile("song.mid")
for msg in mid.tracks[0]:
    if msg.type == "set_tempo":
        msg.tempo = int(mido.bpm2tempo(50))  # 降至50 BPM
    elif msg.type == "note_off":
        msg.time = int(msg.time * 1.5)  # 延长音符间隔
mid.save("slow_song.mid")
