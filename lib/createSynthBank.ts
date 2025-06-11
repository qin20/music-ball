import * as Tone from 'tone';

export interface SynthBank {
  mainSynth: Tone.MetalSynth;
  getType: () => SynthType;
  setVolume: (val: number) => void;
  getVolume: () => number;
  setTranspose: (semitones: number) => void;
  getTranspose: () => number;
  dispose: () => void;
}

export function createSynthBank(type: SynthType = 'metal'): SynthBank {
  const volumeNode = new Tone.Volume({ volume: 0 }).toDestination();

  // 使用 MetalSynth 构造清脆高频声音
  const mainSynth = new Tone.MetalSynth({
    envelope: {
      attack: 0.001,
      decay: 0.3,
      release: 0.2,
    },
    harmonicity: 6.5,
    modulationIndex: 40,
    resonance: 8000,            // 更尖锐
  }).connect(volumeNode);
  mainSynth.frequency.value = 800;

  let transpose = 0;

  return {
    mainSynth,
    getType: () => type,
    setVolume: (val) => (volumeNode.volume.value = val),
    getVolume: () => volumeNode.volume.value,
    setTranspose: (semi) => (transpose = semi),
    getTranspose: () => transpose,
    dispose: () => {
      mainSynth.dispose();
      volumeNode.dispose();
    },
  };
}

export function getOrReplaceBank(
  currentRef: React.MutableRefObject<SynthBank | null>,
  nextType: SynthType,
  opts: { volume?: number; transpose?: number } = {}
): SynthBank {
  const prev = currentRef.current;

  if (prev && prev.getType() === nextType) {
    return prev;
  }

  const volume = opts.volume ?? prev?.getVolume() ?? 0;
  const transpose = opts.transpose ?? prev?.getTranspose() ?? 0;

  const next = createSynthBank(nextType);
  next.setVolume(volume);
  next.setTranspose(transpose);

  prev?.dispose();
  currentRef.current = next;

  return next;
}
