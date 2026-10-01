import { act, fireEvent, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useHardwareKeyboard } from '../components/device/useHardwareKeyboard';
import { hardwareControlById } from '../components/device/hardwareControlMap';
import type { AppKeyEvent } from './inputBus';

function setup(initialApp: string | null, bootActive = false) {
  const openApp = vi.fn();
  const goHome = vi.fn();
  const setHighlightedIndex = vi.fn();
  const onBootStart = vi.fn();
  const onReboot = vi.fn();
  const onCloseLid = vi.fn();
  const hook = renderHook((props: { activeApp: string | null; highlightedIndex?: number | null }) => useHardwareKeyboard({
    enabled: true, activeApp: props.activeApp, openApp, goHome, highlightedIndex: props.highlightedIndex ?? null, setHighlightedIndex, bootActive, onBootStart, onReboot, onCloseLid,
  }), { initialProps: { activeApp: initialApp } as { activeApp: string | null; highlightedIndex?: number | null } });
  const events: AppKeyEvent[] = [];
  hook.result.current.bus.input.subscribe((event) => events.push(event));
  return { hook, openApp, goHome, setHighlightedIndex, events, onBootStart, onReboot, onCloseLid };
}

const press = (key: string, target: Window | Element = window) => fireEvent.keyDown(target, { key });

afterEach(() => { document.body.innerHTML = ''; });

describe('central input dispatcher', () => {
  it('runs reboot from the terminal', () => {
    const { hook, onReboot } = setup(null);
    [...'reboot', 'Enter'].forEach((key) => press(key));
    expect(onReboot).toHaveBeenCalledTimes(1);
    expect(hook.result.current.terminal.open).toBe(false);
  });

  it('runs close from the terminal on the home screen, and not from inside an app', () => {
    const home = setup(null);
    [...'close', 'Enter'].forEach((key) => press(key));
    expect(home.onCloseLid).toHaveBeenCalledTimes(1);
    expect(home.hook.result.current.terminal.open).toBe(false);
    const inApp = setup('projects');
    [...'close', 'Enter'].forEach((key) => press(key));
    expect(inApp.onCloseLid).not.toHaveBeenCalled(); // an open app gets the keys, so the terminal never sees the command
  });

  it('leaves the keyboard alone while the boot sequence plays, and starts from the trackball or D-pad centre only', () => {
    const { hook, onBootStart, setHighlightedIndex } = setup(null, true);
    ['a', 'ArrowRight', 'Enter'].forEach((key) => press(key));
    expect(hook.result.current.terminal.open).toBe(false);
    expect(setHighlightedIndex).not.toHaveBeenCalled();
    act(() => hook.result.current.activateControl(hardwareControlById.get('dpad-up')!));
    expect(onBootStart).not.toHaveBeenCalled();
    act(() => hook.result.current.activateControl(hardwareControlById.get('dpad-center')!));
    expect(onBootStart).toHaveBeenCalledTimes(1);
    act(() => hook.result.current.activateControl(hardwareControlById.get('control-trackball')!));
    expect(onBootStart).toHaveBeenCalledTimes(2);
    expect(setHighlightedIndex).not.toHaveBeenCalled();
  });

  it('opens the terminal from the home screen', () => {
    const { hook } = setup(null);
    press('a');
    expect(hook.result.current.terminal.open).toBe(true);
    expect(hook.result.current.terminal.buffer).toBe('a');
  });

  it('sends everything to the open app and never to the terminal', () => {
    const { hook, events } = setup('snake');
    ['a', 'Alt', 'Shift', ' ', 'Backspace', 'Enter'].forEach((key) => press(key));
    expect(hook.result.current.terminal.open).toBe(false);
    expect(hook.result.current.terminal.buffer).toBe('');
    expect(events.map((e) => e.key)).toEqual(['a', 'Shift', ' ', 'Backspace', 'Enter']);
  });

  it('does not touch home highlight while an app is open, and maps arrows', () => {
    const { setHighlightedIndex, events } = setup('snake');
    press('ArrowRight');
    expect(setHighlightedIndex).not.toHaveBeenCalled();
    expect(events.map((e) => e.key)).toEqual(['ArrowRight']);
  });

  it('maps on-screen D-pad, trackball and keyboard presses to the same events', () => {
    const { hook, events } = setup('snake');
    const { pressControl, releaseControl } = hook.result.current;
    act(() => { pressControl(hardwareControlById.get('dpad-up')!); releaseControl(hardwareControlById.get('dpad-up')!); });
    act(() => { pressControl(hardwareControlById.get('control-trackball')!); releaseControl(hardwareControlById.get('control-trackball')!); });
    act(() => { pressControl(hardwareControlById.get('key-q')!); releaseControl(hardwareControlById.get('key-q')!); });
    expect(events.map((e) => `${e.type}:${e.key}`)).toEqual(['keydown:ArrowUp', 'keyup:ArrowUp', 'keydown:Enter', 'keyup:Enter', 'keydown:q', 'keyup:q']);
  });

  it('closes the app on Escape and on the hardware back button without notifying the app', () => {
    const { hook, goHome, events } = setup('snake');
    press('Escape');
    expect(goHome).toHaveBeenCalledTimes(1);
    act(() => hook.result.current.pressControl(hardwareControlById.get('control-back')!));
    expect(goHome).toHaveBeenCalledTimes(2);
    expect(events).toHaveLength(0);
  });

  it('exposes held keys, keyup, and passes repeats for characters', () => {
    const { hook, events } = setup('snake');
    press('ArrowLeft');
    expect(hook.result.current.bus.input.isDown('ArrowLeft')).toBe(true);
    fireEvent.keyDown(window, { key: 'a' });
    fireEvent.keyDown(window, { key: 'a', repeat: true });
    fireEvent.keyUp(window, { key: 'ArrowLeft' });
    expect(hook.result.current.bus.input.isDown('ArrowLeft')).toBe(false);
    expect(events.filter((e) => e.key === 'a').map((e) => e.repeat)).toEqual([false, true]);
    expect(events.at(-1)).toMatchObject({ type: 'keyup', key: 'ArrowLeft' });
  });

  it('prevents default on keys it consumes so the page never scrolls', () => {
    setup('snake');
    for (const key of ['ArrowDown', ' ', 'ArrowUp']) {
      const event = new KeyboardEvent('keydown', { key, cancelable: true, bubbles: true });
      window.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(true);
    }
  });

  it('lets native inputs keep typing but still lights the key', () => {
    const { hook, events } = setup('chat');
    const input = document.createElement('input');
    document.body.append(input);
    const event = new KeyboardEvent('keydown', { key: 'a', cancelable: true, bubbles: true });
    act(() => { input.dispatchEvent(event); });
    expect(event.defaultPrevented).toBe(false);
    expect(events).toHaveLength(0);
    expect(hook.result.current.terminal.open).toBe(false);
    expect(hook.result.current.pressedIds.has('key-a')).toBe(true);
  });

  it('navigates the home grid with arrow keys and opens the highlighted app', () => {
    const { hook, setHighlightedIndex, openApp } = setup(null);
    press('ArrowRight');
    expect(setHighlightedIndex).toHaveBeenLastCalledWith(0);
    hook.rerender({ activeApp: null, highlightedIndex: 3 });
    press('ArrowDown');
    expect(setHighlightedIndex).toHaveBeenLastCalledWith(7); // the last icon: eight apps in two rows of four
    act(() => { hook.result.current.activateControl(hardwareControlById.get('dpad-center')!); });
    expect(openApp).toHaveBeenCalledWith('notes');
  });

  it('opening an app closes the terminal', () => {
    const { hook } = setup(null);
    press('a');
    expect(hook.result.current.terminal.open).toBe(true);
    act(() => hook.result.current.openApp('about'));
    expect(hook.result.current.terminal.open).toBe(false);
  });
});
