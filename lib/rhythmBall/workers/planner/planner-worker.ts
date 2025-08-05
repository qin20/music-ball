import { RhythmPathPlanner } from '@/lib/rhythmBall/RhythmPathPlanner';
import type { RhythmPathPlannerConfig, RhythmPathPlanData } from '@/lib/rhythmBall/RhythmPathPlanner';

type RequestMessage = {
  id: number;
  type: 'generate';
  config: RhythmPathPlannerConfig;
};

type ResponseMessage = {
  id: number;
  result: RhythmPathPlanData;
};

self.onmessage = (e: MessageEvent<RequestMessage>) => {
  const { id, type, config } = e.data;

  if (type === 'generate') {
    try {
      const planner = new RhythmPathPlanner(config);
      const result = planner.generate();
      const response: ResponseMessage = { id, result };
      (self as any).postMessage(response);
    } catch (error) {
      console.error('Worker error:', error);
      (self as any).postMessage({ id, error: String(error) });
    }
  }
};

export {}; // 避免 TypeScript 报错：Cannot redeclare block-scoped variable
