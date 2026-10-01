import { BOOT } from './bootConfig';

export function hasBooted(): boolean {
  try { return window.localStorage.getItem(BOOT.storageKey) === '1'; } catch { return false; }
}

export function markBooted(): void {
  try { window.localStorage.setItem(BOOT.storageKey, '1'); } catch { /* private mode: it plays again next visit */ }
}
