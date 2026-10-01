import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { SWIVEL } from './swivelConfig';
import { createIdleScheduler, type IdleHooks } from './idleNudge';

const CONFIG = SWIVEL.idle;
const hooksWith = (extra: Partial<Omit<IdleHooks, 'nudge' | 'autoOpen'>> = {}): IdleHooks & { nudge: Mock; autoOpen: Mock } => ({
  active: vi.fn(() => true), nudge: vi.fn(), autoOpen: vi.fn(), nudgesEnabled: () => true, autoOpenEnabled: () => true, ...extra,
});

describe('idle scheduler (mocked time)', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('uses the configured timings: nudge after 3 s, every 6 s, at most 3, auto-open at 12 s, nudge about 7 degrees', () => {
    expect(CONFIG).toMatchObject({ nudgeAfterMs: 3000, nudgeEveryMs: 6000, maxNudges: 3, autoOpenAfterMs: 12000 });
    expect(CONFIG.nudgeDeg).toBeGreaterThanOrEqual(6);
    expect(CONFIG.nudgeDeg).toBeLessThanOrEqual(8);
  });

  it('nudges after 3 s of idleness, not before', () => {
    const hooks = hooksWith();
    createIdleScheduler(CONFIG, hooks).start();
    vi.advanceTimersByTime(2999);
    expect(hooks.nudge).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(hooks.nudge).toHaveBeenCalledTimes(1);
  });

  it('repeats every 6 s while idle', () => {
    const hooks = hooksWith({ autoOpenEnabled: () => false });
    createIdleScheduler(CONFIG, hooks).start();
    vi.advanceTimersByTime(3000 + 6000 - 1);
    expect(hooks.nudge).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1);
    expect(hooks.nudge).toHaveBeenCalledTimes(2);
  });

  it('stops after the cap of 3 nudges', () => {
    const hooks = hooksWith({ autoOpenEnabled: () => false });
    createIdleScheduler(CONFIG, hooks).start();
    vi.advanceTimersByTime(10 * 60_000);
    expect(hooks.nudge).toHaveBeenCalledTimes(3);
  });

  it('an interaction (a restart) cancels the pending nudge and starts the wait again from zero', () => {
    const hooks = hooksWith();
    const idle = createIdleScheduler(CONFIG, hooks);
    idle.start();
    vi.advanceTimersByTime(2900);
    idle.start();
    vi.advanceTimersByTime(2900);
    expect(hooks.nudge).not.toHaveBeenCalled();
    expect(hooks.autoOpen).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(hooks.nudge).toHaveBeenCalledTimes(1);
  });

  it('an interaction resets the nudge count, so a fresh idle spell gets its own nudges', () => {
    const hooks = hooksWith({ autoOpenEnabled: () => false });
    const idle = createIdleScheduler(CONFIG, hooks);
    idle.start();
    vi.advanceTimersByTime(10 * 60_000);
    idle.start();
    vi.advanceTimersByTime(10 * 60_000);
    expect(hooks.nudge).toHaveBeenCalledTimes(6);
  });

  it('does nothing once stopped', () => {
    const hooks = hooksWith();
    const idle = createIdleScheduler(CONFIG, hooks);
    idle.start();
    idle.stop();
    vi.advanceTimersByTime(60_000);
    expect(hooks.nudge).not.toHaveBeenCalled();
    expect(hooks.autoOpen).not.toHaveBeenCalled();
  });

  it('auto-opens at 12 s, once, and nudges stop with it', () => {
    const hooks = hooksWith();
    createIdleScheduler(CONFIG, hooks).start();
    vi.advanceTimersByTime(11_999);
    expect(hooks.autoOpen).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(hooks.autoOpen).toHaveBeenCalledTimes(1);
    const nudgesAtOpen = hooks.nudge.mock.calls.length;
    vi.advanceTimersByTime(60_000);
    expect(hooks.autoOpen).toHaveBeenCalledTimes(1);
    expect(hooks.nudge.mock.calls.length).toBe(nudgesAtOpen);
  });

  it('skips a nudge or auto-open that comes due while the device is busy or hidden', () => {
    const hooks = hooksWith({ active: vi.fn(() => false) });
    createIdleScheduler(CONFIG, hooks).start();
    vi.advanceTimersByTime(60_000);
    expect(hooks.nudge).not.toHaveBeenCalled();
    expect(hooks.autoOpen).not.toHaveBeenCalled();
  });

  it('reduced motion: no nudges, but the auto-open still runs', () => {
    const hooks = hooksWith({ nudgesEnabled: () => false });
    createIdleScheduler(CONFIG, hooks).start();
    vi.advanceTimersByTime(12_000);
    expect(hooks.nudge).not.toHaveBeenCalled();
    expect(hooks.autoOpen).toHaveBeenCalledTimes(1);
  });

  it('no auto-open once the visitor has opened the device themselves', () => {
    const hooks = hooksWith({ autoOpenEnabled: () => false });
    createIdleScheduler(CONFIG, hooks).start();
    vi.advanceTimersByTime(60_000);
    expect(hooks.autoOpen).not.toHaveBeenCalled();
  });
});
