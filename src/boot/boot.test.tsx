import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BootSequence } from './BootSequence';
import { BOOT, PLATTER_APP_STORE_STATUS, PLATTER_APP_STORE_URL, PLATTER_SITE_URL, platterAppStoreCopy } from './bootConfig';
import { hasBooted, markBooted } from './bootSeen';
import { sceneAt } from './bootScene';

describe('bootConfig', () => {
  it('defaults to the live App Store listing', () => {
    expect(PLATTER_APP_STORE_STATUS).toBe('live');
    expect(platterAppStoreCopy('live')).toEqual({ line: 'Now on the App Store', href: PLATTER_APP_STORE_URL });
  });

  it('switches the copy and the link with the status', () => {
    expect(platterAppStoreCopy('coming_soon')).toEqual({ line: 'Coming soon to the App Store', href: PLATTER_SITE_URL });
  });
});

describe('sceneAt', () => {
  const splashStart = BOOT.backlightMs;
  const cardStart = splashStart + BOOT.splashMs;

  it('runs backlight, splash, card, then done in about four seconds', () => {
    expect(sceneAt(0, false).stage).toBe('backlight');
    expect(sceneAt(splashStart, false).stage).toBe('splash');
    expect(sceneAt(cardStart, false).stage).toBe('card');
    expect(sceneAt(cardStart + BOOT.cardMs, false).stage).toBe('done');
    expect(cardStart + BOOT.cardMs).toBeGreaterThan(3500);
    expect(cardStart + BOOT.cardMs).toBeLessThan(4200);
  });

  it('flickers the backlight, starting dark and settling lit', () => {
    expect(sceneAt(0, false).lit).toBe(false);
    expect(sceneAt(50, false).lit).toBe(true);
    expect(sceneAt(90, false).lit).toBe(false);
    expect(sceneAt(BOOT.backlightMs - 1, false).lit).toBe(true);
  });

  it('fills the progress bar in discrete steps and changes the status line', () => {
    const { segments, steps } = BOOT.progress;
    const filled = new Set<number>();
    for (let t = splashStart; t < cardStart; t += 10) filled.add(sceneAt(t, false).segments);
    expect(filled.size).toBe(steps);
    expect(Math.max(...filled)).toBe(segments);
    expect(sceneAt(splashStart, false).status).toBe('Loading applications...');
    expect(sceneAt(cardStart - 1, false).status).toBe('Connecting...');
  });

  it('shows only a static card, with no blink, for reduced motion', () => {
    for (const t of [0, 400, 800, 1400]) expect(sceneAt(t, true)).toMatchObject({ stage: 'card', lit: true, prompt: true });
    expect(sceneAt(BOOT.reducedCardMs, true).stage).toBe('done');
  });
});

describe('bootSeen', () => {
  beforeEach(() => window.localStorage.clear());

  it('remembers a visit', () => {
    expect(hasBooted()).toBe(false);
    markBooted();
    expect(hasBooted()).toBe(true);
  });

  it('survives storage that throws', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('denied'); });
    expect(() => markBooted()).not.toThrow();
    spy.mockRestore();
    const get = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied'); });
    expect(hasBooted()).toBe(false);
    get.mockRestore();
  });
});

describe('BootSequence', () => {
  beforeEach(() => { vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null); });
  afterEach(() => vi.restoreAllMocks());

  const mount = (props: Partial<Parameters<typeof BootSequence>[0]> = {}) => {
    const onSkip = vi.fn();
    const onFinish = vi.fn();
    const view = render(<BootSequence active reducedMotion onSkip={onSkip} onFinish={onFinish} {...props}/>);
    return { onSkip, onFinish, ...view };
  };

  it('shows the live App Store line linking to the store in a new tab', () => {
    mount();
    const link = screen.getByRole('link', { name: 'Now on the App Store' });
    expect(link).toHaveAttribute('href', PLATTER_APP_STORE_URL);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('shows the coming-soon line and links the website instead', () => {
    mount({ status: 'coming_soon' });
    expect(screen.getByRole('link', { name: 'Coming soon to the App Store' })).toHaveAttribute('href', PLATTER_SITE_URL);
  });

  it('skips on a key or a tap, but a tap on the App Store line only opens the link', () => {
    const { onSkip, container } = mount();
    fireEvent.keyDown(window, { key: 'a' });
    expect(onSkip).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(window, { key: 'Shift' });
    fireEvent.keyDown(window, { key: 'Tab' });
    fireEvent.keyDown(window, { key: 'r', metaKey: true });
    expect(onSkip).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('link', { name: 'Now on the App Store' }));
    expect(onSkip).toHaveBeenCalledTimes(1);
    fireEvent.click(container.querySelector('.boot-seq')!);
    expect(onSkip).toHaveBeenCalledTimes(2);
  });

  it('finishes by itself after the static reduced-motion card', () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
    const { onFinish } = mount();
    act(() => { vi.advanceTimersByTime(BOOT.reducedCardMs - 100); });
    expect(onFinish).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(300); });
    expect(onFinish).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
