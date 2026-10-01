import { useEffect, useRef } from 'react';
import type { AppInput, AppKeyEvent } from './inputBus';

/** Subscribe an app to its key events (keydown and keyup) for as long as it is mounted. */
export function useAppInput(input: AppInput, handler: (event: AppKeyEvent) => void) {
  const latest = useRef(handler);
  useEffect(() => { latest.current = handler; });
  useEffect(() => input.subscribe((event) => latest.current(event)), [input]);
}
