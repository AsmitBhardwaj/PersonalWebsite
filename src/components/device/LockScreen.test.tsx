import { act, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CANVAS } from '../../boot/bootConfig';
import { formatLockDate, formatLockTime } from '../../boot/lockRender';
import { LockScreen } from './LockScreen';
import { SWIVEL } from './swivelConfig';

describe('LockScreen', () => {
  it('is a 240x160 pixel canvas that shares the boot canvas styling, with the live time and date as text for tests and readers', () => {
    const { container } = render(<LockScreen on/>);
    const lock = container.querySelector('.lock-screen')!;
    expect(lock).toHaveAttribute('data-on', 'true');
    const canvas = lock.querySelector('canvas')!;
    expect([canvas.width, canvas.height]).toEqual([CANVAS.width, CANVAS.height]);
    expect(canvas).toHaveClass('lock-screen__canvas');
    expect(canvas.parentElement).toHaveClass('lock-screen__lcd');
    expect(lock.textContent).toMatch(/\d{1,2}:\d{2} [AP]M [A-Z]{3} [A-Z]{3} \d{1,2}/);
  });

  it('no longer shows the name', () => {
    const { container } = render(<LockScreen on/>);
    expect(container.textContent).not.toMatch(/asmit/i);
  });

  it('is marked off once the home screen has taken over', () => {
    const { container } = render(<LockScreen on={false}/>);
    expect(container.querySelector('.lock-screen')).toHaveAttribute('data-on', 'false');
  });
});

describe('lock screen text', () => {
  it('formats the time in 12 hours with a plain space and no leading zero', () => {
    expect(formatLockTime(new Date(2026, 9, 1, 23, 8))).toBe('11:08 PM');
    expect(formatLockTime(new Date(2026, 9, 1, 0, 5))).toBe('12:05 AM');
    expect(formatLockTime(new Date(2026, 9, 1, 9, 30))).toBe('9:30 AM');
  });
  it('formats the date as WEEKDAY MONTH DAY in capitals', () => {
    expect(formatLockDate(new Date(2026, 9, 1))).toBe('THU OCT 1');
    expect(formatLockDate(new Date(2026, 11, 25))).toBe('FRI DEC 25');
  });
});

describe('LockScreen first-visit ring', () => {
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
  const reduced = (matches: boolean) => vi.stubGlobal('matchMedia', (query: string) => ({ matches: matches && query.includes('reduce'), media: query, addEventListener: () => undefined, removeEventListener: () => undefined }));

  it('is plain without a ring: full brightness, no message', () => {
    const { container } = render(<LockScreen on/>);
    expect(container.querySelector('.lock-screen')).toHaveAttribute('data-ring', 'off');
    expect(container.textContent).not.toContain(SWIVEL.ring.notification.body);
  });

  it('is dimmed while idle and shows no message yet', () => {
    const { container } = render(<LockScreen on ring="idle"/>);
    const lock = container.querySelector<HTMLElement>('.lock-screen')!;
    expect(lock.style.getPropertyValue('--lock-brightness')).toBe(String(SWIVEL.ring.idleBrightness));
    expect(container.textContent).not.toContain(SWIVEL.ring.notification.body);
  });

  it('brightens and carries the message once awake', () => {
    vi.useFakeTimers();
    reduced(false);
    const { container } = render(<LockScreen on ring="awake"/>);
    act(() => { vi.advanceTimersByTime(SWIVEL.ring.slideMs + 50); });
    const lock = container.querySelector<HTMLElement>('.lock-screen')!;
    expect(lock.style.getPropertyValue('--lock-brightness')).toBe(String(SWIVEL.ring.awakeBrightness));
    expect(lock).toHaveAttribute('data-notice', 'true');
    expect(lock.textContent).toContain('1 new message');
    expect(lock.textContent).toContain('asmit: hey, you found my sidekick');
  });

  it('with reduced motion has no wake transition and the message is there at once', () => {
    reduced(true);
    const { container } = render(<LockScreen on ring="awake"/>);
    expect(container.querySelector<HTMLElement>('.lock-screen')!.style.getPropertyValue('--lock-wake-ms')).toBe('0ms');
    expect(container.textContent).toContain(SWIVEL.ring.notification.body);
  });
});
