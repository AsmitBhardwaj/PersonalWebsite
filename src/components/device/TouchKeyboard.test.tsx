import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { hardwareControlById } from './hardwareControlMap';
import { TouchKeyboard } from './TouchKeyboard';

const setup = (dpad: boolean, pressed: string[] = []) => {
  const handlers = { onActivate: vi.fn(), onPress: vi.fn(), onRelease: vi.fn() };
  render(<TouchKeyboard dpad={dpad} pressedIds={new Set(pressed)} {...handlers}/>);
  return handlers;
};

describe('TouchKeyboard', () => {
  it('routes presses and releases of keyboard keys through the shared handlers', () => {
    const { onPress, onRelease } = setup(false);
    const key = screen.getByRole('button', { name: 'Letter A' });
    fireEvent.pointerDown(key);
    expect(onPress).toHaveBeenCalledWith(hardwareControlById.get('key-a'));
    fireEvent.pointerUp(key);
    expect(onRelease).toHaveBeenCalledWith(hardwareControlById.get('key-a'));
  });

  it('shows the arrow strip only when asked, mapped to the d-pad controls', () => {
    expect(screen.queryByRole('button', { name: /directional pad/i })).toBeNull();
    const { onPress } = setup(true);
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Directional pad up' }));
    expect(onPress).toHaveBeenCalledWith(hardwareControlById.get('dpad-up'));
  });

  it('lights keys that are pressed', () => {
    setup(false, ['key-a']);
    expect(screen.getByRole('button', { name: 'Letter A' })).toHaveClass('is-pressed');
    expect(screen.getByRole('button', { name: 'Letter B' })).not.toHaveClass('is-pressed');
  });
});
