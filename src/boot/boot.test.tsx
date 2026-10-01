import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BootSequence } from './BootSequence';
import { BOOT, PLATTER_APP_STORE_STATUS, PLATTER_APP_STORE_URL, PLATTER_SITE_URL, platterAppStoreCopy, platterProjectStatus } from './bootConfig';
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

  it('derives the Projects page status from the same constant', () => {
    expect(platterProjectStatus()).toEqual(platterProjectStatus(PLATTER_APP_STORE_STATUS));
    expect(platterProjectStatus('live')).toEqual({ text: 'iOS · On the App Store', href: PLATTER_APP_STORE_URL });
    expect(platterProjectStatus('coming_soon')).toEqual({ text: 'iOS · Coming soon to the App Store' });
  });
});

describe('sceneAt', () => {
  const splashStart = BOOT.backlightMs;
  const cardStart = splashStart + BOOT.splashMs;

  it('runs backlight and splash, then holds the card for as long as it takes', () => {
    expect(sceneAt(0, false).stage).toBe('backlight');
    expect(sceneAt(splashStart, false).stage).toBe('splash');
    expect(sceneAt(cardStart, false).stage).toBe('card');
    for (const t of [cardStart + 2000, cardStart + 60_000, 3_600_000]) expect(sceneAt(t, false)).toMatchObject({ stage: 'card', lit: true });
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

  it('shows only the static card for reduced motion, at any time', () => {
    for (const t of [0, 400, 1400, 60_000]) expect(sceneAt(t, true)).toMatchObject({ stage: 'card', lit: true });
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
    const onStart = vi.fn();
    const onCard = vi.fn();
    const view = render(<BootSequence active reducedMotion onStart={onStart} onCard={onCard} {...props}/>);
    return { onStart, onCard, ...view };
  };
  const start = () => screen.getByRole('button', { name: 'Start' });

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

  it('announces the card so Start can be pressed from the hardware', () => {
    const { onCard } = mount();
    expect(onCard).toHaveBeenCalledTimes(1);
  });

  it('starts from the Start button', () => {
    const { onStart } = mount();
    fireEvent.click(start());
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('starts when Enter is released, and only for Enter', () => {
    const { onStart } = mount();
    for (const key of ['a', ' ', 'Escape', 'ArrowRight', 'Shift', 'Tab']) {
      fireEvent.keyDown(window, { key });
      fireEvent.keyUp(window, { key });
    }
    expect(onStart).not.toHaveBeenCalled();
    fireEvent.keyDown(window, { key: 'Enter', metaKey: true });
    fireEvent.keyUp(window, { key: 'Enter' });
    expect(onStart).not.toHaveBeenCalled();
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(onStart).not.toHaveBeenCalled();
    fireEvent.keyUp(window, { key: 'Enter' });
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('ignores a stray Enter release from before the card, such as the key that opened the lid', () => {
    const { onStart } = mount();
    fireEvent.keyUp(window, { key: 'Enter' });
    expect(onStart).not.toHaveBeenCalled();
  });

  it('does nothing for a tap elsewhere on the card, and the App Store line only opens its link', () => {
    const { onStart, container } = mount();
    fireEvent.click(container.querySelector('.boot-seq')!);
    fireEvent.click(container.querySelector('canvas')!);
    fireEvent.click(screen.getByRole('link', { name: 'Now on the App Store' }));
    expect(onStart).not.toHaveBeenCalled();
  });

  it('does not end by itself', () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
    const { onStart } = mount();
    act(() => { vi.advanceTimersByTime(120_000); });
    expect(onStart).not.toHaveBeenCalled();
    expect(start()).toBeInTheDocument();
    vi.useRealTimers();
  });

  it('shows no Start button until the card, with the clock running', () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
    const { onCard } = mount({ reducedMotion: false });
    expect(screen.queryByRole('button', { name: 'Start' })).toBeNull();
    act(() => { vi.advanceTimersByTime(BOOT.backlightMs + 100); });
    expect(screen.queryByRole('button', { name: 'Start' })).toBeNull();
    expect(onCard).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(BOOT.splashMs + 100); });
    expect(start()).toBeInTheDocument();
    expect(onCard).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
