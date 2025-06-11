import * as Tone from 'tone';

interface MidiNote {
  time: number;
  duration: number;
  midi: number;
}

interface PlayerOptions {
  events: MidiNote[];
  synth?: Tone.PolySynth | Tone.Sampler;
  transpose?: number;
  disabledIndexes?: Set<number>;
  onProgress?: (timeMs: number) => void;
  onEnd?: () => void;
}

export function createToneSynthPlayer({
  events,
  synth,
  transpose = 0,
  disabledIndexes = new Set(),
  onProgress,
  onEnd,
}: PlayerOptions) {
  let rafId = 0;
  let startTime: number | null = null;
  let playing = false;
  let index = 0;

  const tick = () => {
    if (!playing || startTime === null) return;

    const now = performance.now();
    const elapsed = now - startTime;

    onProgress?.(elapsed);

    while (index < events.length && events[index].time <= elapsed) {
      const e = events[index];
      if (!disabledIndexes.has(index) && synth) {
        const note = Tone.Frequency(e.midi + transpose, 'midi').toNote();
        synth.triggerAttackRelease(note, e.duration / 1000);
      }
      index++;
    }

    if (index >= events.length) {
      playing = false;
      onEnd?.();
    } else {
      rafId = requestAnimationFrame(tick);
    }
  };

  return {
    start: () => {
      if (!synth || events.length === 0) return;
      startTime = performance.now();
      index = 0;
      playing = true;
      rafId = requestAnimationFrame(tick);
    },
    stop: () => {
      playing = false;
      cancelAnimationFrame(rafId);
    },
    seekTo: (ms: number) => {
      startTime = performance.now() - ms;
      index = events.findIndex((e) => e.time >= ms);
      if (index === -1) index = events.length;
    },
    getCurrentTimeMs: () =>
      playing && startTime != null ? performance.now() - startTime : 0,
  };
}
