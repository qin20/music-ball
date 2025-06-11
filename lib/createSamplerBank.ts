import * as Tone from 'tone';

export interface SamplerBank {
  sampler: Tone.Sampler;
  trigger: (name?: string) => void;
  isLoaded: () => boolean;
  dispose: () => void;
}

/**
 * 创建一个 SamplerBank 实例
 * @param samples - 一个音高与文件路径的映射，如 { C4: 'hit.wav' }
 * @returns SamplerBank
 */
export function createSamplerBank(samples: Record<string, string>): SamplerBank {
  const sampler = new Tone.Sampler(samples).toDestination();

  return {
    sampler,
    trigger: (note = 'C4') => {
      if (sampler.loaded) {
        sampler.triggerAttack(note);
      } else {
        console.warn('Sampler not yet loaded');
      }
    },
    isLoaded: () => sampler.loaded,
    dispose: () => sampler.dispose(),
  };
}
