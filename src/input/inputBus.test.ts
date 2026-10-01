import { describe, expect, it, vi } from 'vitest';
import { createInputBus } from './inputBus';

describe('input bus', () => {
  it('tracks held keys and emits keydown and keyup', () => {
    const bus = createInputBus();
    const handler = vi.fn();
    bus.input.subscribe(handler);
    bus.down('dpad-left', 'ArrowLeft', { repeat: false, source: 'screen' });
    expect(bus.input.isDown('ArrowLeft')).toBe(true);
    bus.up('dpad-left');
    expect(bus.input.isDown('ArrowLeft')).toBe(false);
    expect(handler.mock.calls.map(([e]) => [e.type, e.key])).toEqual([['keydown', 'ArrowLeft'], ['keyup', 'ArrowLeft']]);
  });

  it('passes repeats through and keeps the key held', () => {
    const bus = createInputBus();
    const handler = vi.fn();
    bus.input.subscribe(handler);
    bus.down('key-a', 'a', { repeat: false, source: 'keyboard' });
    bus.down('key-a', 'a', { repeat: true, source: 'keyboard' });
    expect(handler.mock.calls.map(([e]) => e.repeat)).toEqual([false, true]);
    expect(bus.input.isDown('a')).toBe(true);
  });

  it('does not release a key while another control still holds it', () => {
    const bus = createInputBus();
    bus.down('key-enter', 'Enter', { repeat: false, source: 'keyboard' });
    bus.down('control-trackball', 'Enter', { repeat: false, source: 'screen' });
    bus.up('key-enter');
    expect(bus.input.isDown('Enter')).toBe(true);
    bus.up('control-trackball');
    expect(bus.input.isDown('Enter')).toBe(false);
  });

  it('releaseAll emits keyups and reset clears silently', () => {
    const bus = createInputBus();
    const handler = vi.fn();
    bus.input.subscribe(handler);
    bus.down('key-a', 'a', { repeat: false, source: 'keyboard' });
    bus.releaseAll();
    expect(handler).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'keyup', key: 'a' }));
    bus.down('key-b', 'b', { repeat: false, source: 'keyboard' });
    handler.mockClear();
    bus.reset();
    expect(bus.input.held.size).toBe(0);
    expect(handler).not.toHaveBeenCalled();
  });
});
