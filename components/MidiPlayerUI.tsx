'use client';

import { useEffect, useRef, useState } from 'react';
import { MidiPlayer, SynthType } from '@/lib/MidiPlayer'; // ✅ 使用单例
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { concatNotes, getMainTrack, serializeTrack } from '@/lib/Midi'
import { useStore } from '@/hooks/useStore';
import { createGlissandoIntro } from '@/lib/MidiCustomNotes';

const synthTypes: { label: string; value: SynthType }[] = [
  { label: 'FMSynth（金属水杯）', value: 'fmsynth' },
  { label: 'AMSynth（柔和调幅）', value: 'amsynth' },
];

const defaultValues = {
  harmonicity: 10,
  modulationIndex: 1,
  attack: 0.01,
  decay: 2,
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

export default function MidiPlayerUI() {
  const [synthType, setSynthType] = useState<SynthType>('fmsynth');
  const [params, setParams] = useState({ ...defaultValues });
  const [transpose, setTranspose] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const isDraggingRef = useRef(false);
  const {
    value: notes,
    setDefaultValue: setNotes,
  } = useStore<SerializedNote[]>('notes');

  // 只在 notes 或 transpose 改变时，才更新完整播放结构
  useEffect(() => {
    MidiPlayer.get().updateConfig({
      notes,
      transpose,
    });
  }, [notes, transpose]);

  // 合成器参数变化时，单独调用 updateConfig（不传 notes/transpose）
  useEffect(() => {
    MidiPlayer.get().updateConfig({
      synthType,
      volume: 1,
      params,
    });
  }, [synthType, params]);

  useEffect(() => {
    let raf: number;
    const loop = () => {
      if (!isDraggingRef.current) {
        setProgress(MidiPlayer.get().getProgress());
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const handleSynthChange = (type: SynthType) => {
    setSynthType(type);
  };

  const handleParamChange = (key: ParamKey, value: number) => {
    const clamped = Math.max(paramMeta[key].min, Math.min(paramMeta[key].max, value));
    const next = { ...params, [key]: clamped };
    setParams(next);
  };

  const handleTransposeChange = (v: number) => {
    setTranspose(v);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsPlaying(false);

    const mainTrack = await getMainTrack(file);
    const mainNotes = serializeTrack(mainTrack);

    // 拼接 intro + main
    const finalNotes = concatNotes(createGlissandoIntro(), mainNotes);
    // const finalNotes = concatNotes(createGlissandoIntro());

    setNotes(finalNotes);
  };

  const togglePlay = async () => {
    const playing = await MidiPlayer.get().toggle();
    setIsPlaying(playing);
  };

  const handleExport = async () => {
  };

  return (
    <div className="space-y-4 max-w-xl mx-auto">
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

      <div className="space-y-1">
        <Label className="text-sm font-medium leading-tight flex-wrap">
          <div>音高移调（transpose）</div>
          <div className="text-xs text-gray-500 w-full">整体音高偏移，单位为半音（-24 ~ +24）</div>
        </Label>
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Slider
              value={[transpose]}
              min={-24}
              max={24}
              step={1}
              onValueChange={([val]) => handleTransposeChange(val)}
            />

          </div>
          <span className="text-xs text-right">
            <Input
              key={transpose}
              defaultValue={parseFloat(transpose.toFixed(4))}
              step={(24 - -24) / 200}
              onBlur={(e) => {
                const parsed = parseFloat(e.target.value);
                if (!isNaN(parsed)) handleTransposeChange( parsed);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  (e.target as HTMLInputElement).blur();
                }
              }}
              className="w-20 h-6 text-xs px-1 py-0.5 text-center shadow border rounded bg-white"
            />
          </span>
        </div>
      </div>

      <div className="space-y-6">
        {Object.entries(paramMeta).map(([key, { min, max }]) => {
          const typedKey = key as ParamKey;
          const value = params[typedKey];
          const titleMap = {
            harmonicity: '音色亮度比',
            modulationIndex: '调制强度',
            attack: '起音时间',
            decay: '衰减时间',
            release: '释放时间'
          };
          const labelMap: Record<ParamKey, string> = {
            harmonicity: '决定音色明亮或柔和，数值越高越亮',
            modulationIndex: '控制音色复杂度，越高越丰富',
            attack: '声音从无到强的时间，越长越柔',
            decay: '音量从峰值衰减的时间，影响音头感',
            release: '松开后声音淡出的时间，越长拖尾越明显'
          };

          return (
            <div key={key} className="space-y-1">
              <Label className="text-sm font-medium leading-tight flex-wrap">
                <div>{`${titleMap[typedKey]} (${typedKey})`}</div>
                <div className="text-xs text-gray-500 w-full">{labelMap[typedKey]}{` (${min} ~ ${max})`}</div>
              </Label>
              <div className="flex items-center gap-3">
                <div className="flex-1 relative">
                  <Slider
                    value={[value]}
                    min={min}
                    max={max}
                    step={(max - min) / 200}
                    onValueChange={([v]) => handleParamChange(typedKey, v)}
                  />
                </div>
                <span className="text-xs text-right">
                  <Input
                    key={value}
                    type="number"
                    defaultValue={parseFloat(value.toFixed(4))}
                    step={(max - min) / 200}
                    onBlur={(e) => {
                      const parsed = parseFloat(e.target.value);
                      if (!isNaN(parsed)) handleParamChange(typedKey, parsed);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        (e.target as HTMLInputElement).blur();
                      }
                    }}
                    className="w-20 h-6 text-xs px-1 py-0.5 text-center shadow border rounded bg-white"
                  />
                </span>
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
            MidiPlayer.get().setProgress(val);
          }}
          onValueCommit={([val]) => {
            isDraggingRef.current = false;
            MidiPlayer.get().setProgress(val);
          }}
        />
        <div className="text-xs text-center">
          播放进度：{(progress * 100).toFixed(1)}%
        </div>
      </div>

      <div className="flex gap-2">
        <Button onClick={togglePlay}>
          {isPlaying ? '暂停' : '播放'}
        </Button>
        <Button onClick={handleExport}>
          导出音频
        </Button>
      </div>
    </div>
  );
}
