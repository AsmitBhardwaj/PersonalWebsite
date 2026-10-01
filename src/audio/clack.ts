import { useSyncExternalStore } from 'react';
import { SWIVEL } from '../components/device/swivelConfig';

const { url, volume, storageKey } = SWIVEL.sound;

const listeners = new Set<() => void>();
let muted: boolean | null = null;
let audio: HTMLAudioElement | null = null;

function readStored(): boolean {
  try { return window.localStorage.getItem(storageKey) === '1'; } catch { return false; }
}

export function isMuted(): boolean {
  if (muted === null) muted = readStored();
  return muted;
}

export function setMuted(next: boolean): void {
  muted = next;
  try { window.localStorage.setItem(storageKey, next ? '1' : '0'); } catch { /* private mode: the choice lasts for this visit */ }
  listeners.forEach((notify) => notify());
}

const subscribe = (notify: () => void) => { listeners.add(notify); return () => { listeners.delete(notify); }; };

export function useMuted(): boolean {
  return useSyncExternalStore(subscribe, isMuted, () => false);
}

/** Starts fetching the sound so the first clack is not late. Safe to call repeatedly. */
export function preloadClack(): void {
  if (audio || typeof Audio === 'undefined') return;
  audio = new Audio(url);
  audio.preload = 'auto';
  audio.volume = volume;
}

/** Plays the clack unless muted. Call only from a user-initiated swivel. */
export function playClack(): void {
  if (isMuted()) return;
  try {
    preloadClack();
    if (!audio) return;
    audio.currentTime = 0;
    void audio.play().catch(() => { /* autoplay refused or no audio device */ });
  } catch { /* audio unavailable */ }
}

/** Test hook: forget cached state so the next read goes back to storage. */
export function resetClackForTests(): void { muted = null; audio = null; listeners.clear(); }
