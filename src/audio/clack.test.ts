import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SWIVEL } from '../components/device/swivelConfig';
import { isMuted, playClack, resetClackForTests, setMuted } from './clack';

const play = vi.fn(() => Promise.resolve());
class FakeAudio { currentTime = 0; volume = 1; preload = ''; constructor(public src: string) {} play = play; }

beforeEach(() => {
  window.localStorage.clear();
  resetClackForTests();
  play.mockClear();
  vi.stubGlobal('Audio', FakeAudio);
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('clack sound', () => {
  it('plays when not muted and stays quiet when muted', () => {
    playClack();
    expect(play).toHaveBeenCalledTimes(1);
    setMuted(true);
    playClack();
    expect(play).toHaveBeenCalledTimes(1);
  });

  it('remembers the mute choice in localStorage across a fresh start', () => {
    setMuted(true);
    expect(window.localStorage.getItem(SWIVEL.sound.storageKey)).toBe('1');
    resetClackForTests();
    expect(isMuted()).toBe(true);
    setMuted(false);
    resetClackForTests();
    expect(isMuted()).toBe(false);
  });

  it('survives storage that throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    expect(isMuted()).toBe(false);
    expect(() => setMuted(true)).not.toThrow();
    expect(isMuted()).toBe(true);
  });

  it('ignores an autoplay refusal', async () => {
    play.mockImplementationOnce(() => Promise.reject(new Error('NotAllowedError')));
    expect(() => playClack()).not.toThrow();
    await Promise.resolve();
  });
});
