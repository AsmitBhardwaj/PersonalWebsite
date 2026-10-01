import { BOOT } from '../boot/bootConfig';
import { isMuted } from './clack';

let context: AudioContext | null = null;

/** Three short square-wave notes, generated with WebAudio. Silent when muted or when audio is unavailable. */
export function playBootChime(): void {
  if (isMuted()) return;
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    context ??= new Ctor();
    const ctx = context;
    void ctx.resume().catch(() => { /* autoplay refused */ });
    const now = ctx.currentTime;
    for (const note of BOOT.chime.notes) {
      const start = now + note.startMs / 1000;
      const end = start + note.durationMs / 1000;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = note.freq;
      gain.gain.setValueAtTime(BOOT.chime.volume, start);
      gain.gain.setValueAtTime(0, end);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(end + 0.02);
    }
  } catch { /* audio unavailable */ }
}
