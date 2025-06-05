export class EventEmitter {
  constructor() {
    this.events = {};
  }

  on(event, callback) {
    if (!this.events[event]) this.events[event] = [];
    this.events[event].push(callback);
  }

  off(event, callback) {
    if (!this.events[event]) return;
    this.events[event] = this.events[event].filter(cb => cb !== callback);
  }

  emit(event, ...args) {
    if (!this.events[event]) return;
    for (const callback of this.events[event]) {
      callback(...args);
    }
  }

  bind(target) {
    target.on = this.on.bind(this);
    target.off = this.off.bind(this);
    target.emit = this.emit.bind(this);
  }
}
