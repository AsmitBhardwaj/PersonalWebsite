export interface AppKeyEvent {
  type: 'keydown' | 'keyup';
  /** Normalised key: 'ArrowUp', 'Enter', ' ', 'Backspace', 'a', 'Shift'... Back/Escape never reaches apps: it closes them. */
  key: string;
  /** Auto-repeat while held. Passed through for every key except modifiers. */
  repeat: boolean;
  source: 'keyboard' | 'screen';
}

export interface AppInput {
  subscribe: (handler: (event: AppKeyEvent) => void) => () => void;
  isDown: (key: string) => boolean;
  /** Keys currently held down. Live view: read it each frame. */
  readonly held: ReadonlySet<string>;
}

export interface InputBus {
  input: AppInput;
  down: (controlId: string, key: string, meta: { repeat: boolean; source: AppKeyEvent['source'] }) => void;
  up: (controlId: string) => void;
  /** Emit keyup for everything held (window blur). */
  releaseAll: () => void;
  /** Forget held keys silently (app closed). */
  reset: () => void;
}

export function createInputBus(): InputBus {
  const handlers = new Set<(event: AppKeyEvent) => void>();
  // key -> controls currently holding it, so Enter from the keyboard and from the trackball don't release each other.
  const holders = new Map<string, Set<string>>();
  const held = new Set<string>();
  const sources = new Map<string, AppKeyEvent['source']>();
  const emit = (event: AppKeyEvent) => handlers.forEach((handler) => handler(event));

  const bus: InputBus = {
    input: {
      subscribe(handler) { handlers.add(handler); return () => { handlers.delete(handler); }; },
      isDown: (key) => held.has(key),
      held,
    },
    down(controlId, key, { repeat, source }) {
      const set = holders.get(key) ?? new Set<string>();
      const first = set.size === 0;
      set.add(controlId);
      holders.set(key, set);
      held.add(key);
      sources.set(controlId, source);
      if (first || repeat) emit({ type: 'keydown', key, repeat, source });
    },
    up(controlId) {
      for (const [key, set] of holders) {
        if (!set.delete(controlId)) continue;
        if (set.size === 0) {
          holders.delete(key);
          held.delete(key);
          emit({ type: 'keyup', key, repeat: false, source: sources.get(controlId) ?? 'keyboard' });
        }
      }
      sources.delete(controlId);
    },
    releaseAll() { [...new Set([...holders.values()].flatMap((set) => [...set]))].forEach((id) => bus.up(id)); },
    reset() { holders.clear(); held.clear(); sources.clear(); },
  };
  return bus;
}
