import { useSyncExternalStore } from 'react';

type Listener = () => void;

export class Store<T> {
  private history: T[];
  private future: T[];
  private defaultValue: T;
  private value: T;
  private lastCommittedValue: T; // ✅ 用于跳过 history 时依然可记录

  private keyListener: ((e: KeyboardEvent) => void) | null = null;
  private listeners: Set<Listener>;

  constructor(defaultValue: T) {
    this.defaultValue = defaultValue;
    this.value = defaultValue;
    this.history = [defaultValue];
    this.future = [];
    this.lastCommittedValue = defaultValue;
    this.listeners = new Set();
  }

  getInitialValue(): T {
    return this.defaultValue;
  }

  getValue(): T {
    return this.value;
  }

  setDefaultValue(newDefault: T) {
    this.defaultValue = newDefault;
    this.value = newDefault;
    this.history = [newDefault];
    this.future = [];
    this.lastCommittedValue = newDefault;
    this.notify();
  }

  setValue(newValue: T, options?: { skipHistory?: boolean }) {
    const isSameAsCurrent = JSON.stringify(newValue) === JSON.stringify(this.value);
    const isSameAsCommitted = JSON.stringify(newValue) === JSON.stringify(this.lastCommittedValue);

    this.value = newValue;

    if (!options?.skipHistory && !isSameAsCommitted) {
      this.history.push(newValue);
      this.future = [];
      this.lastCommittedValue = newValue;
    }

    if (!isSameAsCurrent) {
      this.notify();
    }
  }

  undo() {
    if (this.history.length <= 1) return;
    const current = this.history.pop()!;
    this.future.unshift(current);
    this.value = this.history[this.history.length - 1];
    this.lastCommittedValue = this.value;
    this.notify();
  }

  redo() {
    if (this.future.length === 0) return;
    const next = this.future.shift()!;
    this.history.push(next);
    this.value = next;
    this.lastCommittedValue = next;
    this.notify();
  }

  canUndo() {
    return this.history.length > 1;
  }

  canRedo() {
    return this.future.length > 0;
  }

  subscribe(fn: Listener) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  enableKeyboardShortcuts() {
    if (this.keyListener) return;
    this.disableKeyboardShortcuts();

    this.keyListener = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().includes('MAC');
      const ctrl = isMac ? e.metaKey : e.ctrlKey;

      if (!ctrl) return;

      if (e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          this.redo();
          e.preventDefault();
        } else {
          this.undo();
          e.preventDefault();
        }
      } else if (e.key.toLowerCase() === 'y') {
        this.redo();
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', this.keyListener);
  }

  disableKeyboardShortcuts() {
    if (!this.keyListener) return;
    window.removeEventListener('keydown', this.keyListener);
    this.keyListener = null;
  }

  private notify() {
    for (const fn of this.listeners) fn();
  }

  // ---------- 静态管理区域 ----------
  private static storeMap = new Map<string, Store<any>>();

  static get<T>(id: string, initialValue?: T): Store<T> {
    if (!this.storeMap.has(id)) {
      if (initialValue === undefined) {
        throw new Error(`UndoRedoStore "${id}" not found and no initialValue provided.`);
      }
      this.storeMap.set(id, new Store<T>(initialValue));
    }
    return this.storeMap.get(id)!;
  }

  static has(id: string) {
    return this.storeMap.has(id);
  }

  static clear(id?: string) {
    if (id) {
      this.storeMap.delete(id);
    } else {
      this.storeMap.clear();
    }
  }

  static keys(): string[] {
    return Array.from(this.storeMap.keys());
  }
}

export function useStore<T>(id: string, initialValue?: T) {
  const store = Store.get<T>(id, initialValue);

  const subscribe = (fn: () => void) => store.subscribe(fn);
  const getValue = () => store.getValue();
  const getDefaultValue = () => store.getInitialValue();

  const defaultValue = useSyncExternalStore(subscribe, getDefaultValue, getDefaultValue);
  const value = useSyncExternalStore(subscribe, getValue, getValue);

  return {
    value,
    defaultValue, // ✅ 响应式 defaultValue
    setValue: store.setValue.bind(store),
    setDefaultValue: store.setDefaultValue.bind(store),
    undo: store.undo.bind(store),
    redo: store.redo.bind(store),
    canUndo: store.canUndo(),
    canRedo: store.canRedo(),
    enableShortcuts: store.enableKeyboardShortcuts.bind(store),
    disableShortcuts: store.disableKeyboardShortcuts.bind(store),
  };
}
