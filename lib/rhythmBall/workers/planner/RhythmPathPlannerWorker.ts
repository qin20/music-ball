import { RhythmPathPlannerConfig } from "@/lib/rhythmBall/RhythmPathPlanner";

export class RhythmPathPlannerWorker {
  private worker: Worker;
  private idCounter = 0;
  private pendingMap = new Map<number, (res: any) => void>();

  constructor() {
    this.worker = new Worker(
      new URL('./planner-worker.ts', import.meta.url),
      { type: 'module' }
    );

    this.worker.onmessage = (e) => {
      const { id, result, error } = e.data;
      const resolver = this.pendingMap.get(id);
      if (resolver) {
        this.pendingMap.delete(id);
        if (error) {
          resolver(Promise.reject(new Error(error)))
        } else {
          resolver(result);
        }
      }
    };
  }

  generateAsync(config: RhythmPathPlannerConfig): Promise<any> {
    return new Promise((resolve) => {
      const id = this.idCounter++;
      this.pendingMap.set(id, resolve);
      this.worker.postMessage({ id, type: 'generate', config });
    });
  }

  dispose() {
    this.worker.terminate();
    this.pendingMap.clear();
  }
}
