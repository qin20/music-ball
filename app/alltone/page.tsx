'use client';

import { useRef, useState, useEffect } from 'react';
import * as Tone from 'tone';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { getMainTrack, serializeTrack } from '@/lib/Midi';

type SynthType = 'fmsynth' | 'amsynth' | 'duosynth' | 'metalsynth' | 'membranesynth';

const synthTypes: { label: string; value: SynthType; poly: boolean }[] = [
  { label: 'FMSynth（金属水杯）', value: 'fmsynth', poly: true },
  { label: 'AMSynth（柔和调幅）', value: 'amsynth', poly: true },
  { label: 'DuoSynth（合唱感）', value: 'duosynth', poly: true },
  { label: 'MetalSynth（金属撞击）', value: 'metalsynth', poly: false },
  { label: 'MembraneSynth（打击鼓）', value: 'membranesynth', poly: false }
];

const defaultValues = {
  harmonicity: 10,
  modulationIndex: 1,
  attack: 0.001,
  decay: 0.8,
  release: 1
};

const paramMeta = {
  harmonicity: { min: 0.1, max: 20 },
  modulationIndex: { min: 0, max: 20 },
  attack: { min: 0.001, max: 1 },
  decay: { min: 0.01, max: 3 },
  release: { min: 0.01, max: 3 }
} as const;

type ParamKey = keyof typeof defaultValues;

export default function AllTonePage() {
  const synthRef = useRef<any>(null);
  const partRef = useRef<Tone.Part | null>(null);
  const [synthType, setSynthType] = useState<SynthType>('fmsynth');
  const [paramValues, setParamValues] = useState({ ...defaultValues });
  const [progress, setProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [notes, setNotes] = useState<MidiNote[] | null>(null);
  const [isReady, setIsReady] = useState(false);
  const durationRef = useRef(0);
  const isDraggingRef = useRef(false);

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

    if (synth.set) {
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
    }
  };

  const handleSynthChange = async (newType: SynthType) => {
    setSynthType(newType);
    setIsPlaying(false);
    setIsReady(false);
    // setProgress(0);
    Tone.Transport.stop();
    partRef.current?.dispose();
    synthRef.current?.dispose();

    setParamValues({ ...defaultValues });

    if (notes) {
      await initSynthAndPart(notes, newType);
    }
  };

  const initSynthAndPart = async (data: MidiNote[], type: SynthType = synthType) => {
    const config = { ...paramValues };
    const isPoly = synthTypes.find(s => s.value === type)?.poly;
    let synth: any;

    if (isPoly) {
      const SynthClass = {
        fmsynth: Tone.FMSynth,
        amsynth: Tone.AMSynth,
        duosynth: Tone.DuoSynth
      }[type as string] || Tone.Synth;

      synth = new Tone.PolySynth(SynthClass as any).toDestination();
      synth.set({
        harmonicity: config.harmonicity,
        modulationIndex: config.modulationIndex,
        envelope: {
          attack: config.attack,
          decay: config.decay,
          sustain: 0,
          release: config.release
        }
      });
    } else {
      if (type === 'metalsynth') {
        synth = new Tone.MetalSynth({
          envelope: { attack: config.attack, decay: config.decay, release: config.release },
          harmonicity: config.harmonicity,
          modulationIndex: config.modulationIndex,
          resonance: 4000
        }).toDestination();;
        synth.frequency.value = 100;
      } else {
        synth = new Tone.MembraneSynth({
          pitchDecay: 0.05,
          envelope: { attack: config.attack, decay: config.decay, release: config.release }
        }).toDestination();
      }
    }

    synth.volume.value = 0;
    synthRef.current = synth;

    const eventMap = new Map<number, MidiNote[]>();
    data.forEach(n => {
      if (!eventMap.has(n.time)) eventMap.set(n.time, []);
      eventMap.get(n.time)!.push(n);
    });

    const events = Array.from(eventMap.entries()).map(([time, notes]) => ({
      time: time / 1000,
      notes,
      duration: Math.max(...notes.map(n => n.duration)) / 1000,
      velocity: Math.max(...notes.map(n => n.velocity), 0.1)
    })).sort((a, b) => a.time - b.time);

    durationRef.current = events.at(-1)?.time + events.at(-1)?.duration || 0;

    const part = new Tone.Part((time, ev) => {
      if (isPoly) {
        synth.triggerAttackRelease(ev.notes.map(n => n.pitch), ev.duration, time, 1);
      } else {
        for (const n of ev.notes) {
          synth.triggerAttackRelease(n.pitch, ev.duration, time, 1);
        }
      }
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

    // ✅ 清空旧合成器与 Part
    partRef.current?.dispose();
    synthRef.current?.dispose();
    synthRef.current = null;
    partRef.current = null;

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
      <h1 className="text-2xl font-semibold">🎛 AllTone 合成器测试台</h1>

      <div className="space-y-2">
        <Label>上传 MIDI 文件</Label>
        <Input
          id="midi-upload"
          type="file"
          accept=".mid,.midi"
          onChange={handleFileSelect}
        />
      </div>

      <div className="space-y-2">
        <Label>合成器选择</Label>
        <div className="flex flex-col gap-1">
          {synthTypes.map(({ label, value }) => (
            <label key={value} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="synthType"
                value={value}
                checked={synthType === value}
                onChange={() => handleSynthChange(value)}
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        {Object.entries(paramMeta).map(([key, { min, max }]) => {
          const typedKey = key as ParamKey;
          const value = paramValues[typedKey];
          const labelMap: Record<ParamKey, string> = {
            harmonicity: '载波与调制波频率比，影响音色明亮程度',
            modulationIndex: '调制深度，越高音色越复杂',
            attack: '起音时间，越长越柔',
            decay: '衰减时间，影响音头形态',
            release: '释放时间，影响拖尾'
          };

          return (
            <div key={key} className="space-y-1">
              <Label className="text-sm font-medium leading-tight flex-wrap">
                <div>{typedKey}</div>
                <div className="text-xs text-gray-500 w-full">{labelMap[typedKey]}</div>
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
