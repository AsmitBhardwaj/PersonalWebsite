import { describe, expect, it } from 'vitest';
import { availableCommands, resolveCommand } from './commandRegistry';

describe('command registry', () => {
  it('lists now in help but still resolves notes and now to the same app', () => {
    expect(availableCommands).toContain('now');
    expect(availableCommands).not.toContain('notes');
    expect(resolveCommand('now')).toEqual({ type: 'app', app: 'notes' });
    expect(resolveCommand('notes')).toEqual({ type: 'app', app: 'notes' });
  });

  it('has a close command, listed in help', () => {
    expect(resolveCommand('close')).toEqual({ type: 'close' });
    expect(availableCommands).toContain('close');
  });

  it('has a plain command, listed in help', () => {
    expect(resolveCommand('plain')).toEqual({ type: 'plain' });
    expect(availableCommands).toContain('plain');
  });
});
