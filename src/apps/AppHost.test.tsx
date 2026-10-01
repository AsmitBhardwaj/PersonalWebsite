import { useEffect } from 'react';
import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createInputBus } from '../input/inputBus';
import { useAppInput } from '../input/useAppInput';
import { AppHost } from './AppHost';
import type { AppDefinition, AppProps } from './types';
import { Music } from 'lucide-react';

function Game({ input, paused }: AppProps) {
  useAppInput(input, (event) => { if (event.type === 'keydown') tick(event.key); });
  useEffect(() => { if (paused) return; const id = window.setInterval(frame, 10); return () => window.clearInterval(id); }, [paused]);
  return <p>game {paused ? 'paused' : 'running'}</p>;
}
const tick = vi.fn();
const frame = vi.fn();

const makeApp = (overrides: Partial<AppDefinition> = {}): AppDefinition => ({ id: 'game', label: 'Game', icon: Music, tone: '#000', component: Game, ...overrides });

describe('AppHost lifecycle', () => {
  it('calls onOpen and onClose, stops timers, and clears held keys on close', () => {
    vi.useFakeTimers();
    const bus = createInputBus();
    const onOpen = vi.fn();
    const onClose = vi.fn();
    const { unmount } = render(<AppHost app={makeApp({ onOpen, onClose })} bus={bus} close={() => undefined}/>);
    expect(onOpen).toHaveBeenCalledTimes(1);
    act(() => { bus.down('dpad-up', 'ArrowUp', { repeat: false, source: 'screen' }); vi.advanceTimersByTime(35); });
    expect(tick).toHaveBeenCalledWith('ArrowUp');
    expect(frame.mock.calls.length).toBeGreaterThan(0);
    unmount();
    const calls = frame.mock.calls.length;
    vi.advanceTimersByTime(100);
    expect(frame.mock.calls.length).toBe(calls);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(bus.input.held.size).toBe(0);
    vi.useRealTimers();
  });

  it('pauses when the page is hidden', () => {
    const bus = createInputBus();
    render(<AppHost app={makeApp()} bus={bus} close={() => undefined}/>);
    expect(screen.getByText('game running')).toBeInTheDocument();
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    act(() => { document.dispatchEvent(new Event('visibilitychange')); });
    expect(screen.getByText('game paused')).toBeInTheDocument();
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  });
});
