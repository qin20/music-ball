'use client'

import { useRef, useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { getMainTrack, serializeTrack } from '@/lib/Midi'
import { INSTRUMENTS } from '@/lib/INSTRUMENTS'
import Soundfont from 'soundfont-player'
import { Label } from '@/components/ui/label'

export default function SoundfontPage() {
  const [notes, setNotes] = useState<MidiNote[]>([])
  const [isPlaying, setIsPlaying] = useState(false)
  const [instrumentName, setInstrumentName] = useState<Soundfont.InstrumentName>('celesta')
  const [soundfont, setSoundfont] = useState<string>('MusyngKite')
  const [progress, setProgress] = useState(0)
  const audioCtx = useRef<AudioContext | null>(null)
  const instrumentRef = useRef<Soundfont.Player | null>(null)
  const stopFlag = useRef(false)
  const currentIndex = useRef(0)
  const raf = useRef(0)
  const startTimestampRef = useRef(0)

  const defaultParams = { attack: 0.001, decay: 1, sustain: 0, release: 1 }

  useEffect(() => {
    cancelAnimationFrame(raf.current)
    const loop = () => {
      if (isPlaying && notes.length) {
        const now = performance.now() - startTimestampRef.current
        const total = notes[notes.length - 1].time
        setProgress(Math.min(now / total, 1))
      }
      raf.current = requestAnimationFrame(loop)
    }
    loop()
    return () => cancelAnimationFrame(raf.current)
  }, [isPlaying, notes])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const track = await getMainTrack(file);
    const notes = serializeTrack(track);
    setNotes(notes)
    currentIndex.current = 0
  }

  const loadInstrument = async (name: Soundfont.InstrumentName) => {
    if (!audioCtx.current) {
      audioCtx.current = new AudioContext()
    }

    // instrumentRef.current = await Soundfont.instrument(audioCtx.current, name, {
    //   soundfont,
    // })
    instrumentRef.current = await Soundfont.instrument(audioCtx.current, 'synth_drum', {
      soundfont: 'Tabla',
    })
  }

  const handleInstrumentChange = async (value: Soundfont.InstrumentName) => {
    setInstrumentName(value)
    await loadInstrument(value)
  }

  const playFromIndex = async (startIdx = 0) => {
    if (!audioCtx.current || !instrumentRef.current) return
    stopFlag.current = false
    setIsPlaying(true)
    startTimestampRef.current = performance.now() - (notes[startIdx]?.time ?? 0)

    for (let i = startIdx; i < notes.length; i++) {
      if (stopFlag.current) break
      const now = performance.now() - startTimestampRef.current
      const note = notes[i]
      const delay = Math.max(0, note.time - now)
      await new Promise(res => setTimeout(res, delay))
      instrumentRef.current.play(note.pitch, audioCtx.current.currentTime, {
        duration: note.duration / 1000,
        gain: note.velocity,
        ...defaultParams
      })
      currentIndex.current = i + 1
    }

    setIsPlaying(false)
  }

  const handlePlay = async () => {
    if (!notes.length || isPlaying) return
    if (!audioCtx.current) {
      audioCtx.current = new AudioContext()
    }
    if (!instrumentRef.current) {
      await loadInstrument(instrumentName)
    }
    await playFromIndex(currentIndex.current)
  }

  const handlePause = () => {
    stopFlag.current = true
    setIsPlaying(false)
  }

  const handleSeek = async (val: number) => {
    stopFlag.current = true
    const time = val * (notes[notes.length - 1]?.time || 1)
    const idx = notes.findIndex(n => n.time >= time)
    currentIndex.current = Math.max(0, idx)
    setTimeout(() => playFromIndex(currentIndex.current), 50)
  }

  return (
    <main className="p-6 max-w-6xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">🎵 SoundFont MIDI 播放器</h1>

      <Input type="file" accept=".mid" onChange={handleUpload} />

      <div>
        <p className="text-sm font-medium mb-2">🎼 选择SoundFont</p>
        <div className="flex flex-wrap gap-2">
          <RadioGroup className="flex flex-wrap gap-2">
            {['MusyngKite', 'FluidR3_GM', 'FatBoy'].map((s) => (
              <div key={s} className="flex items-center gap-3">
                <RadioGroupItem checked={soundfont === s} id={s} value={s} onClick={() => setSoundfont(s)} />
                <Label htmlFor={s}>{s}</Label>
              </div>
            ))}
          </RadioGroup>
        </div>
      </div>

      <div>
        <p className="text-sm font-medium mb-2">🎼 选择乐器</p>
        <div className="flex flex-wrap gap-2">
          {INSTRUMENTS.map(inst => (
            <button
              key={inst.name}
              onClick={() => handleInstrumentChange(inst.name)}
              className={`px-2 py-1 text-sm rounded border transition
                ${instrumentName === inst.name ? 'bg-primary text-white' : 'bg-transparent text-foreground'}
              `}
            >
              {inst.label}
            </button>
          ))}
        </div>
      </div>

      <Slider
        value={[progress]}
        min={0}
        max={1}
        step={0.001}
        onValueChange={([val]) => setProgress(val)}
        onValueCommit={([val]) => handleSeek(val)}
      />

      <div className="flex gap-2">
        <Button onClick={handlePlay} disabled={isPlaying || !notes.length}>▶️ 播放</Button>
        <Button onClick={handlePause} disabled={!isPlaying}>⏸️ 暂停</Button>
      </div>

      {notes.length > 0 && (
        <div className="text-sm text-muted-foreground">
          共载入 {notes.length} 个音符，音域范围：{notes[0].pitch} ~ {notes[notes.length - 1].pitch}
        </div>
      )}
    </main>
  )
}
