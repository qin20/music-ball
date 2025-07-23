'use client';

import { MidiPlayer } from '@/lib/MidiPlayer';
import { Rhythm } from '@/lib/rhythmBall/Rhythm';
import { useCallback, useState } from "react";

// ✅ 全局共享实例
let rhythmInstance: Rhythm | null = null;
let isRefreshing = false;

export function useRhythmInstance() {
  const [loading, setLoading] = useState(isRefreshing);

  const set = useCallback((rh: Rhythm) => {
    rhythmInstance = rh;
  }, []);

  const get = useCallback(() => {
    return rhythmInstance;
  }, []);

  const refresh = useCallback(async () => {
    if (isRefreshing || !rhythmInstance) return; // ✅ 添加 loading 判断
    setLoading(true);
    isRefreshing = true;
    try {
      await rhythmInstance.refresh();
      MidiPlayer.get().pause();
      MidiPlayer.get().seek(0);
      rhythmInstance.render();
    } finally {
      setLoading(false);
      isRefreshing = false;
    }
  }, []);

  return { refresh, loading, set, get } as const;
}
