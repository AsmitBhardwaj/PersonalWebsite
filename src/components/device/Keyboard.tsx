import type { CSSProperties } from 'react';

type KeyVariant = 'normal' | 'number' | 'modifier' | 'action' | 'enter' | 'space';
type KeySymbol = 'shift' | 'delete' | 'enter' | 'mail' | 'function';

interface KeySpec {
  id: string;
  primary?: string;
  secondary?: string;
  symbol?: KeySymbol;
  variant: KeyVariant;
  width: number;
}

interface KeyRow {
  id: string;
  className: string;
  offset: number;
  gap: number;
  keys: KeySpec[];
}

const letter = (primary: string, secondary?: string, width = 7.45): KeySpec => ({
  id: primary,
  primary,
  secondary,
  variant: 'normal',
  width,
});

const rows: KeyRow[] = [
  {
    id: 'numbers',
    className: 'number-row',
    offset: 1.5,
    gap: 1.05,
    keys: [
      ...['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map((primary, index) => ({
        id: primary,
        primary,
        secondary: ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')'][index],
        variant: 'number' as const,
        width: 7.25,
      })),
      { id: 'delete', symbol: 'delete', variant: 'action', width: 8.35 },
    ],
  },
  {
    id: 'top-letters',
    className: 'top-letter-row',
    offset: 3,
    gap: 1.05,
    keys: [
      letter('q', '~'), letter('w', '`'), letter('e', '€'), letter('r', '®'), letter('t', '†'),
      letter('y', '¥'), letter('u', '¨'), letter('i', '¡'), letter('o', 'º'), letter('p', '+'),
    ],
  },
  {
    id: 'home-letters',
    className: 'home-letter-row',
    offset: 4.8,
    gap: 1.05,
    keys: [
      letter('a', 'ª'), letter('s', '§'), letter('d', '°'), letter('f', '£'), letter('g', '©'),
      letter('h', '•'), letter('j', '¿'), letter('k', '«'), letter('l', '»'), letter(';', ':'),
    ],
  },
  {
    id: 'bottom-letters',
    className: 'bottom-letter-row',
    offset: 1,
    gap: 1.05,
    keys: [
      { id: 'shift', symbol: 'shift', variant: 'modifier', width: 9 },
      letter('z', 'ž'), letter('x', '×'), letter('c', '¢'), letter('v', '√'), letter('b', 'β'),
      letter('n', 'ñ'), letter('m', 'µ'), letter(',', '?'), letter('.', '/'),
      { id: 'enter', symbol: 'enter', variant: 'enter', width: 9.4 },
    ],
  },
  {
    id: 'functions',
    className: 'function-row',
    offset: 9.6,
    gap: 1.4,
    keys: [
      { id: 'alt', primary: 'ALT', variant: 'modifier', width: 9 },
      { id: 'mail', symbol: 'mail', variant: 'action', width: 8.35 },
      { id: 'space', variant: 'space', width: 40.5 },
      { id: 'function', symbol: 'function', variant: 'action', width: 8.35 },
      { id: 'sym', primary: 'SYM', variant: 'modifier', width: 9 },
    ],
  },
];

function PrintedSymbol({ symbol }: { symbol: KeySymbol }) {
  if (symbol === 'shift') {
    return <svg className="key-symbol" viewBox="0 0 24 24"><path d="M5 11 12 4l7 7h-4v8H9v-8H5Z"/></svg>;
  }
  if (symbol === 'delete') {
    return <svg className="key-symbol" viewBox="0 0 24 24"><path d="M4 7.5 8 4h12v16H8l-4-3.5v-9Z"/><path d="m11 9 5 6m0-6-5 6"/></svg>;
  }
  if (symbol === 'enter') {
    return <svg className="key-symbol" viewBox="0 0 24 24"><path d="M19 5v8H7m0 0 4-4m-4 4 4 4"/></svg>;
  }
  if (symbol === 'mail') {
    return <svg className="key-symbol" viewBox="0 0 24 24"><rect x="4" y="6" width="16" height="12" rx="1.5"/><path d="m5 8 7 5 7-5"/></svg>;
  }
  return <svg className="key-symbol key-symbol--function" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 4v3m0 10v3M4 12h3m10 0h3"/></svg>;
}

export function Keyboard() {
  return <div className="keyboard" aria-hidden="true">
    {rows.map((row) => {
      const rowStyle = {
        '--row-offset': `${row.offset}%`,
        '--row-gap': `${row.gap}%`,
      } as CSSProperties;

      return <div className={`key-row ${row.className}`} style={rowStyle} key={row.id}>
        {row.keys.map((key) => {
          const keyStyle = { '--key-width': `${key.width}%` } as CSSProperties;
          return <span className={`key key--${key.variant}`} style={keyStyle} key={key.id}>
            {key.symbol ? <PrintedSymbol symbol={key.symbol}/> : key.variant === 'space' ? <i className="space-mark"/> : <b>{key.primary}</b>}
            {key.secondary && <small>{key.secondary}</small>}
          </span>;
        })}
      </div>;
    })}
  </div>;
}
