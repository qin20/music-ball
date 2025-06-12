type EventMap = {
  [event: string]: (...args: any[]) => void;
};

class BaseEmitter<Events extends EventMap> {
  private events: Partial<{ [K in keyof Events]: Events[K][] }> = {};

  on<K extends keyof Events>(event: K, callback: Events[K]) {
    if (!this.events[event]) this.events[event] = [];
    this.events[event]!.push(callback);
  }

  off<K extends keyof Events>(event: K, callback: Events[K]) {
    if (!this.events[event]) return;
    this.events[event] = this.events[event]!.filter(cb => cb !== callback);
  }

  emit<K extends keyof Events>(event: K, ...args: Parameters<Events[K]>) {
    if (!this.events[event]) return;
    for (const cb of this.events[event]!) {
      cb(...args);
    }
  }
}

export function withEventEmitter<Events extends EventMap>() {
  return class extends BaseEmitter<Events> {};
}
