// Synthesises the swivel "clack": a latch click plus a short plastic body knock. Deterministic, original work,
// released as CC0 (see README). Run with `npm run assets:audio`; writes public/assets/audio/clack.wav.
import { Buffer } from 'node:buffer';
import { mkdirSync, writeFileSync } from 'node:fs';
import process from 'node:process';

const RATE = 22050;
const SECONDS = 0.11;
const samples = new Float32Array(Math.floor(RATE * SECONDS));

let seed = 0x5eed1234;
const noise = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 0x80000000 - 1; };

// A damped sine at `freq` Hz that starts at `start` seconds and fades with time constant `decay`.
const ring = (start, freq, decay, gain) => {
  for (let i = Math.floor(start * RATE); i < samples.length; i++) {
    const t = i / RATE - start;
    samples[i] += Math.sin(2 * Math.PI * freq * t) * Math.exp(-t / decay) * gain;
  }
};

// High-passed noise for the sharp edge of the click.
const tick = (start, decay, gain) => {
  let previous = 0;
  for (let i = Math.floor(start * RATE); i < samples.length; i++) {
    const t = i / RATE - start;
    const n = noise();
    samples[i] += (n - previous) * 0.5 * Math.exp(-t / decay) * gain;
    previous = n;
  }
};

tick(0, 0.0016, 1.1);          // latch edge
ring(0, 2300, 0.006, 0.45);    // spring-steel ping
ring(0, 780, 0.014, 0.55);     // plastic body knock
ring(0.0125, 1650, 0.004, 0.3); // the catch seating, a hair after the first hit
tick(0.0125, 0.0012, 0.55);

const peak = samples.reduce((max, v) => Math.max(max, Math.abs(v)), 0);
const pcm = Buffer.alloc(samples.length * 2);
samples.forEach((v, i) => {
  const fade = Math.min(1, (samples.length - i) / 200); // no click at the tail
  pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v / peak * 0.9 * fade)) * 32767), i * 2);
});

const header = Buffer.alloc(44);
header.write('RIFF', 0); header.writeUInt32LE(36 + pcm.length, 4); header.write('WAVEfmt ', 8);
header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(1, 22);
header.writeUInt32LE(RATE, 24); header.writeUInt32LE(RATE * 2, 28); header.writeUInt16LE(2, 32); header.writeUInt16LE(16, 34);
header.write('data', 36); header.writeUInt32LE(pcm.length, 40);

mkdirSync('public/assets/audio', { recursive: true });
writeFileSync('public/assets/audio/clack.wav', Buffer.concat([header, pcm]));
process.stdout.write(`clack.wav: ${header.length + pcm.length} bytes\n`);
