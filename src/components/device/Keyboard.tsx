type KeyVariant = 'normal' | 'compact' | 'modifier' | 'action' | 'enter' | 'space';

interface KeySpec {
  id: string;
  label?: string;
  secondary?: string;
  variant?: KeyVariant;
  symbol?: 'shift' | 'delete' | 'enter' | 'mail' | 'function';
}

interface KeyRow {
  id: string;
  className: string;
  keys: KeySpec[];
}

const letters = (characters: string[], secondary: Record<string, string> = {}): KeySpec[] =>
  characters.map((label) => ({ id: label, label, secondary: secondary[label] }));

const rows: KeyRow[] = [
  {
    id: 'numbers', className: 'number-row',
    keys: [
      ...['1','2','3','4','5','6','7','8','9','0'].map((label, index) => ({ id: label, label, secondary: ['!','@','#','$','%','^','&','*','(',')'][index], variant: 'compact' as const })),
      { id: 'delete', variant: 'action', symbol: 'delete' },
    ],
  },
  { id: 'top-letters', className: 'top-letter-row', keys: letters(['q','w','e','r','t','y','u','i','o','p'], { q: '~', w: '`', e: '€', r: '®', t: '†', y: '¥', u: '¨', i: '¡', o: 'º', p: '+' }) },
  { id: 'home-letters', className: 'home-letter-row', keys: letters(['a','s','d','f','g','h','j','k','l',';'], { a: 'ª', s: '§', d: '°', f: '£', g: '©', h: '•', j: '¿', k: '«', l: '»', ';': ':' }) },
  {
    id: 'bottom-letters', className: 'bottom-letter-row',
    keys: [
      { id: 'shift', variant: 'modifier', symbol: 'shift' },
      ...letters(['z','x','c','v','b','n','m',',','.'], { z: 'ž', x: '×', c: '¢', v: '√', b: 'β', n: 'ñ', m: 'µ', ',': '?', '.': '/' }),
      { id: 'enter', variant: 'enter', symbol: 'enter' },
    ],
  },
  {
    id: 'functions', className: 'function-row',
    keys: [
      { id: 'alt', label: 'ALT', variant: 'modifier' },
      { id: 'mail', variant: 'action', symbol: 'mail' },
      { id: 'space', variant: 'space' },
      { id: 'function', variant: 'action', symbol: 'function' },
      { id: 'sym', label: 'SYM', variant: 'modifier' },
    ],
  },
];

function KeySymbol({ symbol }: { symbol: NonNullable<KeySpec['symbol']> }) {
  if (symbol === 'shift') return <span className="key-symbol key-symbol--shift">⇧</span>;
  if (symbol === 'delete') return <span className="key-symbol key-symbol--delete">⌫</span>;
  if (symbol === 'enter') return <span className="key-symbol key-symbol--enter">↵</span>;
  if (symbol === 'mail') return <span className="key-symbol key-symbol--mail">✉</span>;
  return <span className="key-symbol key-symbol--function">✣</span>;
}

export function Keyboard() {
  return <div className="keyboard" aria-hidden="true">
    {rows.map((row) => <div className={`key-row ${row.className}`} key={row.id}>
      {row.keys.map((key) => <span className={`key key--${key.variant ?? 'normal'}`} key={key.id}>
        {key.symbol ? <KeySymbol symbol={key.symbol}/> : key.variant === 'space' ? <i className="space-mark"/> : <b>{key.label}</b>}
        {key.secondary && <small>{key.secondary}</small>}
      </span>)}
    </div>)}
  </div>;
}
