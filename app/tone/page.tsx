'use client';

import { useRef, useState, useEffect } from 'react';
import * as Tone from 'tone';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { getMainTrack, serializeTrack } from '@/lib/Midi';

const paramMeta = {
  harmonicity: { min: 0.1, max: 20 },
  modulationIndex: { min: 0, max: 20 },
  attack: { min: 0.001, max: 1 },
  decay: { min: 0.01, max: 3 },
  release: { min: 0.01, max: 3 }
} as const;

const defaultValues = {
  harmonicity: 7.5,
  modulationIndex: 18,
  attack: 0.001,
  decay: 2,
  release: 2
};

type ParamKey = keyof typeof defaultValues;

type MidiNote = {
  time: number;        // ms
  pitch: string;       // e.g. "C4"
  duration: number;    // ms
  velocity: number;
  solfege: string;
  delta: number;
  midi: number;
};

export default function TonePage() {
  const synthRef = useRef<Tone.PolySynth<Tone.FMSynth> | null>(null);
  const partRef = useRef<Tone.Part | null>(null);
  const [paramValues, setParamValues] = useState({ ...defaultValues });
  const [progress, setProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [notes, setNotes] = useState<MidiNote[] | null>(null);
  const [isReady, setIsReady] = useState(false);
  const durationRef = useRef(0);
  const isDraggingRef = useRef(false);

  // 播放进度监听
  useEffect(() => {
    let raf: number;
    const loop = () => {
      if (!isDraggingRef.current && durationRef.current) {
        const now = Tone.Transport.seconds;
        setProgress(Math.min(now / durationRef.current, 1));
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const updateParam = (key: ParamKey, value: number) => {
    const clamped = Math.max(paramMeta[key].min, Math.min(paramMeta[key].max, value));
    setParamValues(prev => ({ ...prev, [key]: clamped }));

    const synth = synthRef.current;
    if (!synth) return;

    // 使用 .set() 正确更新 Tone.PolySynth 参数
    if (key === 'harmonicity' || key === 'modulationIndex') {
      synth.set({ [key]: clamped });
    } else if (['attack', 'decay', 'release'].includes(key)) {
      synth.set({
        envelope: {
          ...synth.get().envelope,
          [key]: clamped
        }
      });
    }
  };

  const initSynthAndPart = async (data: MidiNote[]) => {
    const synth = new Tone.PolySynth(Tone.FMSynth, {
      harmonicity: paramValues.harmonicity,
      modulationIndex: paramValues.modulationIndex,
      oscillator: { type: 'sine' },
      modulation: { type: 'sine' },
      envelope: {
        attack: paramValues.attack,
        decay: paramValues.decay,
        sustain: 0,
        release: paramValues.release
      },
      modulationEnvelope: { attack: 0.01, decay: 0.2, sustain: 0, release: 0.2 }
    }).toDestination();

    synth.volume.value = -6;
    synthRef.current = synth;

    // 合并同时间作为和弦
    const eventMap = new Map<number, MidiNote[]>();
    data.forEach(n => {
      if (!eventMap.has(n.time)) eventMap.set(n.time, []);
      eventMap.get(n.time)!.push(n);
    });

    const events = Array.from(eventMap, ([time, notes]) => ({
      time: time / 1000,
      note: notes.map(n => n.pitch),
      duration: Math.max(...notes.map(n => n.duration)) / 1000,
      velocity: Math.max(...notes.map(n => n.velocity), 0.1)
    })).sort((a, b) => a.time - b.time);

    const last = events.at(-1);
    durationRef.current = last ? last.time + last.duration : 0;

    const part = new Tone.Part((time, ev) => {
      synth.triggerAttackRelease(ev.note, ev.duration, time, ev.velocity);
    }, events).start(0);

    part.loop = false;
    partRef.current = part;

    setIsReady(true);
  };


  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const track = await getMainTrack(file);
    const notes = serializeTrack(track);
    notes.sort((a, b) => a.time - b.time);
    // let lastTime = -1;
    for (const n of notes) {
      notes.push(n);
      // if (n.time !== lastTime) {
      //   notes.push(n);
      //   lastTime = n.time;
      // }
    }
    console.log(notes.map(j => j.pitch).join(', '));
    console.log(notes.map(j => j.midi).join(', '));
    setNotes(notes);
    setIsReady(false);
    setIsPlaying(false);
    setProgress(0);
    Tone.Transport.stop();
  };

  const handlePlayToggle = async () => {
    await Tone.start();
    if (!isReady && notes) {
      await initSynthAndPart(notes);
    }

    if (Tone.Transport.state === 'started') {
      Tone.Transport.pause();
      setIsPlaying(false);
    } else {
      Tone.Transport.start('+0.1');
      setIsPlaying(true);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-semibold">FMSynth 水杯音模拟器</h1>

      <div className="space-y-2">
        <Label htmlFor="midi-upload">上传 MIDI 文件</Label>
        <Input
          id="midi-upload"
          type="file"
          accept=".mid,.midi"
          onChange={handleFileSelect}
        />
      </div>

      <div className="space-y-6">
        {Object.entries(paramMeta).map(([key, { min, max }]) => {
          const typedKey = key as ParamKey;
          const value = paramValues[typedKey];

          // 中文说明
          const labelMap: Record<string, string> = {
            harmonicity: '调频比：载波与调制波的频率比，影响音色高低和明亮程度',
            modulationIndex: '调制深度：控制调制幅度，值越高音色越复杂',
            attack: '起音时间：从无声到最大音量所需时间，影响打击感',
            decay: '衰减时间：音量从峰值下降到持续阶段的时间，影响音头形态',
            release: '释放时间：松开键后声音自然消失的时间，影响尾音拖尾'
          };

          return (
            <div key={key} className="space-y-1">
              <Label className="text-sm font-medium leading-tight flex-wrap">
                <div>{typedKey}</div>
                <div className="text-xs text-gray-500 w-full">
                  {labelMap[typedKey]}
                </div>
              </Label>
              <div className="flex items-center gap-3">
                <span className="text-xs w-10 text-left">{min}</span>
                <div className="flex-1 relative">
                  <Slider
                    value={[value]}
                    min={min}
                    max={max}
                    step={(max - min) / 200}
                    onValueChange={([v]) => updateParam(typedKey, v)}
                  />
                  <Input
                    key={value}
                    type="number"
                    defaultValue={value.toFixed(4)}
                    step={(max - min) / 200}
                    onBlur={(e) => {
                      const parsed = parseFloat(e.target.value);
                      if (!isNaN(parsed)) updateParam(typedKey, parsed);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        (e.target as HTMLInputElement).blur();
                      }
                    }}
                    className="absolute -top-14 left-1/2 -translate-x-1/2 w-32 h-6 text-xs px-1 py-0.5 text-center shadow border rounded bg-white"
                  />
                </div>
                <span className="text-xs w-10 text-right">{max}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 播放进度滑块 */}
      <div className="space-y-2 pt-4">
        <Slider
          value={[progress]}
          min={0}
          max={1}
          step={0.001}
          onValueChange={([val]) => {
            isDraggingRef.current = true;
            setProgress(val);
          }}
          onValueCommit={([val]) => {
            isDraggingRef.current = false;
            const total = durationRef.current;
            Tone.Transport.seconds = val * total;
          }}
        />
        <div className="text-xs text-center">
          播放进度：{(progress * 100).toFixed(1)}%
        </div>
      </div>

      <Button onClick={handlePlayToggle} disabled={!notes}>
        {isPlaying ? '暂停' : '播放'}
      </Button>
    </div>
  );
}
