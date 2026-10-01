import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { portfolio } from '../../content/portfolio';
import { homeApps } from '../../apps/registry';
import { navigateGrid } from '../../apps/gridNav';
import type { AppId } from '../../apps/types';
import { createInputBus } from '../../input/inputBus';
import { controlKey, MODIFIER_KEYS, physicalKeyToControlId } from '../../input/keys';
import { availableCommands, resolveCommand } from './commandRegistry';
import { hardwareControlById, type HardwareControl } from './hardwareControlMap';

const MAX_BUFFER_LENGTH = 52;
const MIN_LIGHT_MS = 105;

export interface HardwareTerminalState {
  open: boolean;
  buffer: string;
  feedback: string;
  shift: boolean;
  alt: boolean;
  symbol: boolean;
}

type InputAction =
  | { type: 'character'; value: string; shiftValue?: string }
  | { type: 'space' }
  | { type: 'backspace' }
  | { type: 'shift' }
  | { type: 'alt' }
  | { type: 'symbol' }
  | { type: 'open'; feedback?: string }
  | { type: 'close' }
  | { type: 'feedback'; feedback: string; clearBuffer?: boolean; close?: boolean }
  | { type: 'clear' };

const initialTerminal: HardwareTerminalState = {
  open: false,
  buffer: '',
  feedback: '',
  shift: false,
  alt: false,
  symbol: false,
};

function terminalReducer(state: HardwareTerminalState, action: InputAction): HardwareTerminalState {
  switch (action.type) {
    case 'character': {
      const shifted = state.shift || state.symbol;
      const value = shifted ? action.shiftValue ?? action.value.toUpperCase() : action.value;
      return { ...state, open: true, buffer: `${state.buffer}${value}`.slice(0, MAX_BUFFER_LENGTH), feedback: '', shift: false, symbol: false };
    }
    case 'space':
      return { ...state, open: true, buffer: `${state.buffer} `.slice(0, MAX_BUFFER_LENGTH), feedback: '' };
    case 'backspace':
      return { ...state, open: true, buffer: state.buffer.slice(0, -1), feedback: '' };
    case 'shift':
      return { ...state, open: true, shift: !state.shift, feedback: state.shift ? '' : 'Shift: next character' };
    case 'alt':
      return { ...state, open: true, alt: !state.alt, feedback: state.alt ? 'ALT released' : 'ALT shortcuts: GH · LI · MAIL' };
    case 'symbol':
      return { ...state, open: true, symbol: !state.symbol, feedback: state.symbol ? 'Symbol mode off' : 'Symbol mode: next supported key' };
    case 'open':
      return { ...state, open: true, feedback: action.feedback ?? state.feedback };
    case 'close':
      return { ...initialTerminal };
    case 'feedback':
      return { ...state, open: !action.close, buffer: action.clearBuffer ? '' : state.buffer, feedback: action.feedback, shift: false, symbol: false };
    case 'clear':
      return { ...initialTerminal, open: true };
  }
}

interface UseHardwareKeyboardOptions {
  enabled: boolean;
  activeApp: AppId | null;
  openApp: (app: AppId) => void;
  goHome: () => void;
  highlightedIndex: number | null;
  setHighlightedIndex: (index: number | null) => void;
  /** The boot sequence owns the screen: keys do nothing here, and the trackball or D-pad centre presses Start. */
  bootActive: boolean;
  onBootStart: () => void;
  onReboot: () => void;
  /** Shut the lid with the closing swivel and clack (the `close` command, home screen only). */
  onCloseLid: () => void;
}

function isEditableTarget(target: EventTarget | null) {
  return target instanceof HTMLElement && (target.matches('input, textarea, select') || target.isContentEditable);
}

type Phase = 'down' | 'up';
type Source = 'keyboard' | 'screen';

/**
 * The single input dispatcher. Physical keys and on-screen controls both become a HardwareControl + phase,
 * then are routed to exactly one owner: the open app, otherwise the home screen (highlight + terminal).
 */
export function useHardwareKeyboard({ enabled, activeApp, openApp, goHome, highlightedIndex, setHighlightedIndex, bootActive, onBootStart, onReboot, onCloseLid }: UseHardwareKeyboardOptions) {
  const [terminal, dispatch] = useReducer(terminalReducer, initialTerminal);
  const [pressedIds, setPressedIds] = useState<ReadonlySet<string>>(() => new Set());
  const [bus] = useState(createInputBus);
  const litAt = useRef(new Map<string, number>());

  const latest = useRef({ enabled, activeApp, openApp, goHome, highlightedIndex, setHighlightedIndex, terminal, bootActive, onBootStart, onReboot, onCloseLid });
  useEffect(() => { latest.current = { enabled, activeApp, openApp, goHome, highlightedIndex, setHighlightedIndex, terminal, bootActive, onBootStart, onReboot, onCloseLid }; });

  const light = useCallback((id: string) => {
    if (!litAt.current.has(id)) litAt.current.set(id, performance.now());
    setPressedIds((current) => current.has(id) ? current : new Set(current).add(id));
  }, []);

  const unlight = useCallback((id: string) => {
    const started = litAt.current.get(id);
    if (started === undefined) return;
    litAt.current.delete(id);
    const clear = () => setPressedIds((current) => {
      if (!current.has(id) || litAt.current.has(id)) return current;
      const next = new Set(current);
      next.delete(id);
      return next;
    });
    const wait = MIN_LIGHT_MS - (performance.now() - started);
    if (wait > 0) window.setTimeout(clear, wait); else clear();
  }, []);

  const openAppFromAnywhere = useCallback((app: AppId) => {
    dispatch({ type: 'close' });
    latest.current.openApp(app);
  }, []);

  const routeHome = useCallback((control: HardwareControl, repeat: boolean) => {
    const s = latest.current;
    const executeCommand = () => {
      const rawCommand = s.terminal.buffer.trim();
      if (!rawCommand) { dispatch({ type: 'feedback', feedback: 'Type help for commands.', clearBuffer: true }); return; }
      const destination = resolveCommand(rawCommand);
      if (!destination) { dispatch({ type: 'feedback', feedback: 'Command not found. Type help.', clearBuffer: true }); return; }
      if (destination.type === 'app') {
        openAppFromAnywhere(destination.app);
        dispatch({ type: 'feedback', feedback: `Opening ${destination.app}…`, clearBuffer: true, close: true });
      } else if (destination.type === 'home') {
        s.goHome();
        dispatch({ type: 'feedback', feedback: 'Home', clearBuffer: true, close: true });
      } else if (destination.type === 'help') {
        dispatch({ type: 'feedback', feedback: availableCommands.join(' · '), clearBuffer: true });
      } else if (destination.type === 'clear') {
        dispatch({ type: 'clear' });
      } else if (destination.type === 'close') {
        if (s.activeApp) { dispatch({ type: 'feedback', feedback: 'Go home first.', clearBuffer: true }); return; }
        dispatch({ type: 'close' });
        s.onCloseLid();
      } else if (destination.type === 'reboot') {
        dispatch({ type: 'close' });
        s.onReboot();
      } else {
        if (destination.destination === 'github') window.open(portfolio.social.github, '_blank', 'noopener,noreferrer');
        if (destination.destination === 'linkedin') window.open(portfolio.social.linkedin, '_blank', 'noopener,noreferrer');
        if (destination.destination === 'email') window.location.href = `mailto:${portfolio.email}`;
        dispatch({ type: 'feedback', feedback: `Opening ${destination.destination}…`, clearBuffer: true, close: true });
      }
    };

    switch (control.action) {
      case 'character': dispatch({ type: 'character', value: control.value ?? '', shiftValue: control.shiftValue }); break;
      case 'space': dispatch({ type: 'space' }); break;
      case 'backspace': dispatch({ type: 'backspace' }); break;
      case 'shift': if (!repeat) dispatch({ type: 'shift' }); break;
      case 'alt': dispatch({ type: 'alt' }); break;
      case 'symbol': dispatch({ type: 'symbol' }); break;
      case 'enter': if (!repeat) executeCommand(); break;
      case 'open-command': dispatch({ type: 'open', feedback: 'Type help to list commands.' }); break;
      case 'navigate': s.setHighlightedIndex(navigateGrid(s.highlightedIndex, control.value ?? '', homeApps.length)); break;
      case 'select': {
        if (s.highlightedIndex === null) {
          s.setHighlightedIndex(0);
          if (control.id === 'dpad-center') openAppFromAnywhere(homeApps[0].id);
          break;
        }
        openAppFromAnywhere(homeApps[s.highlightedIndex].id);
        break;
      }
      case 'contact': openAppFromAnywhere('contact'); break;
      case 'back': if (s.terminal.open) dispatch({ type: 'close' }); break;
    }
  }, [openAppFromAnywhere]);

  /** The routing decision: one owner per event. */
  const route = useCallback((control: HardwareControl, phase: Phase, repeat: boolean, source: Source) => {
    const s = latest.current;
    if (!s.enabled || s.bootActive) return;
    if (s.activeApp) {
      // An app owns all input: the terminal and home screen never see it.
      if (control.action === 'back') { if (phase === 'down' && !repeat) s.goHome(); return; }
      const key = controlKey(control);
      if (phase === 'up') bus.up(control.id);
      else if (!(repeat && MODIFIER_KEYS.has(key))) bus.down(control.id, key, { repeat, source });
      return;
    }
    if (phase === 'down') routeHome(control, repeat);
  }, [bus, routeHome]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!enabled || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.target instanceof HTMLElement && event.target.closest('.hardware-control, [data-boot-link], [data-boot-start]')) return;
      const controlId = physicalKeyToControlId(event.key);
      const control = controlId ? hardwareControlById.get(controlId) : undefined;
      if (!controlId || !control) return;
      light(controlId);
      // Real inputs keep their typing: only the lighting reacts.
      if (isEditableTarget(event.target)) return;
      event.preventDefault();
      route(control, 'down', event.repeat, 'keyboard');
    };
    const onKeyUp = (event: KeyboardEvent) => {
      const controlId = physicalKeyToControlId(event.key);
      if (!controlId) return;
      unlight(controlId);
      const control = hardwareControlById.get(controlId);
      if (control && !isEditableTarget(event.target)) route(control, 'up', false, 'keyboard');
    };
    const onBlur = () => {
      bus.releaseAll();
      [...litAt.current.keys()].forEach(unlight);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [bus, enabled, light, route, unlight]);

  return {
    terminal,
    pressedIds,
    bus,
    openApp: openAppFromAnywhere,
    /** On-screen pointer down: lights the key and, while an app is open, starts a held key. */
    pressControl: useCallback((control: HardwareControl) => {
      light(control.id);
      if (latest.current.activeApp) route(control, 'down', false, 'screen');
    }, [light, route]),
    releaseControl: useCallback((control: HardwareControl) => {
      unlight(control.id);
      route(control, 'up', false, 'screen');
    }, [route, unlight]),
    /** On-screen click. Home handles it here; an app already got pointer down/up, except for keyboard-triggered clicks (detail 0). */
    activateControl: useCallback((control: HardwareControl, fromKeyboard = false) => {
      if (!latest.current.enabled) return;
      // Only the trackball or D-pad centre presses Start; every other control is inert behind the boot screen.
      if (latest.current.bootActive) { if (control.action === 'select') latest.current.onBootStart(); return; }
      if (latest.current.activeApp) {
        if (fromKeyboard) { route(control, 'down', false, 'screen'); route(control, 'up', false, 'screen'); }
        return;
      }
      routeHome(control, false);
    }, [route, routeHome]),
    closeTerminal: useCallback(() => dispatch({ type: 'close' }), []),
  };
}
