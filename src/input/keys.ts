import type { HardwareControl } from '../components/device/hardwareControlMap';

const arrows: Record<string, string> = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' };

/** Semantic key an app sees for a hardware control. D-pad = arrows, trackball/D-pad centre = Enter. */
export function controlKey(control: HardwareControl): string {
  switch (control.action) {
    case 'character': return control.value ?? '';
    case 'space': return ' ';
    case 'backspace': return 'Backspace';
    case 'enter':
    case 'select': return 'Enter';
    case 'navigate': return arrows[control.value ?? ''] ?? '';
    case 'back': return 'Escape';
    case 'shift': return 'Shift';
    case 'alt': return 'Alt';
    case 'symbol': return 'Symbol';
    case 'open-command': return 'Function';
    case 'contact': return control.id === 'control-call' ? 'Call' : 'Mail';
  }
}

export const MODIFIER_KEYS = new Set(['Shift', 'Alt', 'Symbol']);

/** Physical keyboard key -> hardware control id, so both input paths produce identical events and lighting. */
export function physicalKeyToControlId(key: string): string | null {
  const normalized = key.toLowerCase();
  if (/^[a-z0-9]$/.test(normalized)) return `key-${normalized}`;
  if (key === ';' || key === ':') return 'key-semicolon';
  if (key === ',' || key === '<') return 'key-comma';
  if (key === '.' || key === '>') return 'key-period';
  if (key === ' ') return 'key-space';
  if (key === 'Backspace') return 'key-backspace';
  if (key === 'Enter') return 'key-enter';
  if (key === 'Shift') return 'key-shift';
  if (key === 'Escape') return 'control-back';
  if (key === 'ArrowUp') return 'dpad-up';
  if (key === 'ArrowDown') return 'dpad-down';
  if (key === 'ArrowLeft') return 'dpad-left';
  if (key === 'ArrowRight') return 'dpad-right';
  return null;
}
