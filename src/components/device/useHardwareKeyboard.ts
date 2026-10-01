import { useCallback, useEffect, useReducer, useState } from 'react';
import { portfolio } from '../../content/portfolio';
import type { AppName } from '../apps/PhoneApps';
import { availableCommands, resolveCommand } from './commandRegistry';
import { hardwareControlById, type HardwareControl } from './hardwareControlMap';

const MAX_BUFFER_LENGTH = 52;
const homeApps: AppName[] = ['projects', 'experience', 'about', 'notes', 'contact'];

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
  activeApp: AppName | null;
  openApp: (app: AppName) => void;
  goHome: () => void;
  highlightedIndex: number | null;
  setHighlightedIndex: (index: number | null) => void;
}

function isEditableTarget(target: EventTarget | null) {
  return target instanceof HTMLElement && (target.matches('input, textarea, select') || target.isContentEditable);
}

function keyToControlId(key: string) {
  const normalized = key.toLowerCase();
  if (/^[a-z0-9]$/.test(normalized)) return `key-${normalized}`;
  if (key === ';' || key === ':') return 'key-semicolon';
  if (key === ',' || key === '<') return 'key-comma';
  if (key === '.' || key === '>') return 'key-period';
  if (key === ' ') return 'key-space';
  if (key === 'Backspace') return 'key-backspace';
  if (key === 'Enter') return 'key-enter';
  if (key === 'Shift') return 'key-shift';
  return null;
}

export function useHardwareKeyboard({
  enabled,
  activeApp,
  openApp,
  goHome,
  highlightedIndex,
  setHighlightedIndex,
}: UseHardwareKeyboardOptions) {
  const [terminal, dispatch] = useReducer(terminalReducer, initialTerminal);
  const [pressedId, setPressedId] = useState<string | null>(null);

  const executeCommand = useCallback(() => {
    const rawCommand = terminal.buffer.trim();
    if (!rawCommand) {
      dispatch({ type: 'feedback', feedback: 'Type help for commands.', clearBuffer: true });
      return;
    }

    const destination = resolveCommand(rawCommand);
    if (!destination) {
      dispatch({ type: 'feedback', feedback: 'Command not found. Type help.', clearBuffer: true });
      return;
    }

    if (destination.type === 'app') {
      openApp(destination.app);
      dispatch({ type: 'feedback', feedback: `Opening ${destination.app}…`, clearBuffer: true, close: true });
    } else if (destination.type === 'home') {
      goHome();
      dispatch({ type: 'feedback', feedback: 'Home', clearBuffer: true, close: true });
    } else if (destination.type === 'help') {
      dispatch({ type: 'feedback', feedback: availableCommands.join(' · '), clearBuffer: true });
    } else if (destination.type === 'clear') {
      dispatch({ type: 'clear' });
    } else {
      if (destination.destination === 'github') window.open(portfolio.social.github, '_blank', 'noopener,noreferrer');
      if (destination.destination === 'linkedin') window.open(portfolio.social.linkedin, '_blank', 'noopener,noreferrer');
      if (destination.destination === 'email') window.location.href = `mailto:${portfolio.email}`;
      dispatch({ type: 'feedback', feedback: `Opening ${destination.destination}…`, clearBuffer: true, close: true });
    }
  }, [goHome, openApp, terminal.buffer]);

  const moveHighlight = useCallback((direction: string) => {
    if (activeApp) {
      dispatch({ type: 'open', feedback: 'Use Back to return home.' });
      return;
    }
    if (highlightedIndex === null) {
      setHighlightedIndex(0);
      return;
    }
    const next = (() => {
      if (direction === 'left') return highlightedIndex === 4 ? 4 : Math.max(0, highlightedIndex - 1);
      if (direction === 'right') return highlightedIndex === 4 ? 4 : Math.min(3, highlightedIndex + 1);
      if (direction === 'down') return highlightedIndex < 4 ? 4 : 4;
      if (direction === 'up') return highlightedIndex === 4 ? 0 : highlightedIndex;
      return highlightedIndex;
    })();
    setHighlightedIndex(next);
  }, [activeApp, highlightedIndex, setHighlightedIndex]);

  const selectHighlighted = useCallback((controlId: string) => {
    if (activeApp) return;
    if (highlightedIndex === null) {
      setHighlightedIndex(0);
      if (controlId === 'dpad-center') openApp(homeApps[0]);
      return;
    }
    openApp(homeApps[highlightedIndex]);
  }, [activeApp, highlightedIndex, openApp, setHighlightedIndex]);

  const activateControl = useCallback((control: HardwareControl) => {
    if (!enabled) return;
    switch (control.action) {
      case 'character':
        dispatch({ type: 'character', value: control.value ?? '', shiftValue: control.shiftValue });
        break;
      case 'space': dispatch({ type: 'space' }); break;
      case 'backspace': dispatch({ type: 'backspace' }); break;
      case 'shift': dispatch({ type: 'shift' }); break;
      case 'alt': dispatch({ type: 'alt' }); break;
      case 'symbol': dispatch({ type: 'symbol' }); break;
      case 'enter': executeCommand(); break;
      case 'open-command': dispatch({ type: 'open', feedback: 'Type help to list commands.' }); break;
      case 'navigate': moveHighlight(control.value ?? ''); break;
      case 'select': selectHighlighted(control.id); break;
      case 'contact':
        openApp('contact');
        dispatch({ type: 'close' });
        break;
      case 'back':
        if (terminal.open) dispatch({ type: 'close' });
        else if (activeApp) goHome();
        break;
    }
  }, [activeApp, enabled, executeCommand, goHome, moveHighlight, openApp, selectHighlighted, terminal.open]);

  const flashControl = useCallback((id: string) => {
    setPressedId(id);
    window.setTimeout(() => setPressedId((current) => current === id ? null : current), 105);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!enabled || event.metaKey || event.ctrlKey || event.altKey || isEditableTarget(event.target)) return;
      if (event.target instanceof HTMLElement && event.target.closest('.hardware-control')) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        if (terminal.open) dispatch({ type: 'close' });
        else if (activeApp) goHome();
        return;
      }
      const controlId = keyToControlId(event.key);
      if (!controlId) return;
      const control = hardwareControlById.get(controlId);
      if (!control || (event.repeat && ['shift', 'enter'].includes(control.action))) return;
      event.preventDefault();
      flashControl(controlId);
      activateControl(control);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activateControl, activeApp, enabled, flashControl, goHome, terminal.open]);

  return {
    terminal,
    pressedId,
    activateControl,
    pressControl: setPressedId,
    releaseControl: () => setPressedId(null),
    closeTerminal: () => dispatch({ type: 'close' }),
  };
}
