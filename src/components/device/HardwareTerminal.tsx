import type { HardwareTerminalState } from './useHardwareKeyboard';

interface HardwareTerminalProps {
  terminal: HardwareTerminalState;
  onClose: () => void;
}

export function HardwareTerminal({ terminal, onClose }: HardwareTerminalProps) {
  if (!terminal.open) return <div className="hardware-terminal-live" aria-live="polite">{terminal.feedback}</div>;

  return <section className="hardware-terminal" aria-label="Hardware command interface">
    <button type="button" className="hardware-terminal__close" onClick={onClose} aria-label="Close command interface">×</button>
    <div className="hardware-terminal__line">
      <span className="hardware-terminal__prompt">asmit@portfolio:~$</span>
      <output data-testid="command-buffer">{terminal.buffer}</output>
      <i className="hardware-terminal__cursor" aria-hidden="true"/>
    </div>
    <div className="hardware-terminal__meta">
      <span>{terminal.shift ? 'SHIFT' : terminal.alt ? 'ALT' : terminal.symbol ? 'SYM' : 'HW INPUT'}</span>
      <span className="hardware-terminal__feedback" aria-live="polite">{terminal.feedback}</span>
    </div>
  </section>;
}
