export const DEVICE_REFERENCE = { width: 1586, height: 992 } as const;

export type HardwareAction =
  | 'character'
  | 'space'
  | 'backspace'
  | 'enter'
  | 'shift'
  | 'alt'
  | 'symbol'
  | 'navigate'
  | 'select'
  | 'back'
  | 'contact'
  | 'open-command';

export interface HardwareControl {
  id: string;
  label: string;
  value?: string;
  shiftValue?: string;
  action: HardwareAction;
  x: number;
  y: number;
  width: number;
  height: number;
  shape?: 'rounded-rect' | 'circle';
  group: 'keyboard' | 'dpad' | 'right-control';
}

const character = (
  value: string,
  x: number,
  y: number,
  width = 44,
  height = 34,
  shiftValue?: string,
): HardwareControl => ({
  id: `key-${value === ';' ? 'semicolon' : value === ',' ? 'comma' : value === '.' ? 'period' : value}`,
  label: /^[a-z]$/.test(value) ? `Letter ${value.toUpperCase()}` : /^[0-9]$/.test(value) ? `Number ${value}` : `Punctuation ${value}`,
  value,
  shiftValue,
  action: 'character',
  x,
  y,
  width,
  height,
  shape: 'rounded-rect',
  group: 'keyboard',
});

const numberRow = [
  character('1', 457, 615, 42, 34, '!'), character('2', 520, 615, 42, 34, '@'),
  character('3', 582, 615, 42, 34, '#'), character('4', 646, 615, 42, 34, '$'),
  character('5', 710, 615, 42, 34, '%'), character('6', 774, 615, 42, 34, '^'),
  character('7', 839, 615, 42, 34, '&'), character('8', 905, 615, 42, 34, '*'),
  character('9', 971, 615, 42, 34, '('), character('0', 1032, 615, 40, 34, ')'),
  { id: 'key-backspace', label: 'Backspace', action: 'backspace', x: 1104, y: 615, width: 49, height: 34, shape: 'rounded-rect', group: 'keyboard' },
] satisfies HardwareControl[];

const topRow = [
  character('q', 443, 668), character('w', 507, 668), character('e', 573, 668), character('r', 638, 668),
  character('t', 704, 668), character('y', 770, 668), character('u', 835, 668), character('i', 901, 668),
  character('o', 967, 668), character('p', 1033, 668),
];

const homeRow = [
  character('a', 474, 722), character('s', 539, 722), character('d', 605, 722), character('f', 670, 722),
  character('g', 735, 722), character('h', 801, 722), character('j', 866, 722), character('k', 932, 722),
  character('l', 998, 722), character(';', 1064, 722, 44, 34, ':'),
];

const bottomLetterRow = [
  { id: 'key-shift', label: 'Shift', action: 'shift', x: 432, y: 775, width: 48, height: 34, shape: 'rounded-rect', group: 'keyboard' },
  character('z', 509, 775), character('x', 574, 775), character('c', 639, 775), character('v', 705, 775),
  character('b', 770, 775), character('n', 836, 775), character('m', 901, 775),
  character(',', 968, 775, 42, 34, '<'), character('.', 1032, 775, 42, 34, '>'),
  { id: 'key-enter', label: 'Enter', action: 'enter', x: 1101, y: 775, width: 49, height: 34, shape: 'rounded-rect', group: 'keyboard' },
] satisfies HardwareControl[];

const functionRow = [
  { id: 'key-alt', label: 'ALT modifier', action: 'alt', x: 466, y: 828, width: 50, height: 32, shape: 'rounded-rect', group: 'keyboard' },
  { id: 'key-mail', label: 'Open contact email', action: 'contact', x: 545, y: 828, width: 48, height: 32, shape: 'rounded-rect', group: 'keyboard' },
  { id: 'key-space', label: 'Space', action: 'space', value: ' ', x: 614, y: 828, width: 288, height: 32, shape: 'rounded-rect', group: 'keyboard' },
  { id: 'key-function', label: 'Open command interface', action: 'open-command', x: 943, y: 828, width: 47, height: 32, shape: 'rounded-rect', group: 'keyboard' },
  { id: 'key-sym', label: 'Symbol modifier', action: 'symbol', x: 1017, y: 828, width: 49, height: 32, shape: 'rounded-rect', group: 'keyboard' },
] satisfies HardwareControl[];

const dpad = [
  { id: 'dpad-up', label: 'Directional pad up', value: 'up', action: 'navigate', x: 270, y: 601, width: 58, height: 36, shape: 'rounded-rect', group: 'dpad' },
  { id: 'dpad-down', label: 'Directional pad down', value: 'down', action: 'navigate', x: 270, y: 687, width: 58, height: 34, shape: 'rounded-rect', group: 'dpad' },
  { id: 'dpad-left', label: 'Directional pad left', value: 'left', action: 'navigate', x: 232, y: 641, width: 40, height: 42, shape: 'rounded-rect', group: 'dpad' },
  { id: 'dpad-right', label: 'Directional pad right', value: 'right', action: 'navigate', x: 326, y: 641, width: 40, height: 42, shape: 'rounded-rect', group: 'dpad' },
  { id: 'dpad-center', label: 'Directional pad select', action: 'select', x: 280, y: 642, width: 40, height: 40, shape: 'rounded-rect', group: 'dpad' },
] satisfies HardwareControl[];

const rightControls = [
  { id: 'control-call', label: 'Open contact', action: 'contact', x: 1260, y: 566, width: 68, height: 44, shape: 'rounded-rect', group: 'right-control' },
  { id: 'control-trackball', label: 'Trackball select', action: 'select', x: 1257, y: 638, width: 74, height: 74, shape: 'circle', group: 'right-control' },
  { id: 'control-back', label: 'Hardware back', action: 'back', x: 1260, y: 742, width: 68, height: 43, shape: 'rounded-rect', group: 'right-control' },
] satisfies HardwareControl[];

export const hardwareControls: HardwareControl[] = [
  ...numberRow,
  ...topRow,
  ...homeRow,
  ...bottomLetterRow,
  ...functionRow,
  ...dpad,
  ...rightControls,
];

export const hardwareControlById = new Map(hardwareControls.map((control) => [control.id, control]));
