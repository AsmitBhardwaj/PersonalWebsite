import type { CSSProperties } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp } from 'lucide-react';
import { DEVICE_REFERENCE, hardwareControlById, hardwareControls, type HardwareControl } from './hardwareControlMap';

/** The QWERTY section of the device art, in the 1586x992 reference space. */
export const KEYBOARD_CROP = { x: 410, y: 590, width: 770, height: 290 } as const;

const keys = hardwareControls.filter((control) => control.group === 'keyboard');
const arrows = [
  { id: 'dpad-left', Icon: ArrowLeft }, { id: 'dpad-up', Icon: ArrowUp },
  { id: 'dpad-down', Icon: ArrowDown }, { id: 'dpad-right', Icon: ArrowRight },
] as const;

export interface TouchKeyboardProps {
  /** Show the arrow-key strip (the d-pad) above the keyboard. */
  dpad: boolean;
  pressedIds: ReadonlySet<string>;
  onActivate: (control: HardwareControl, fromKeyboard: boolean) => void;
  onPress: (control: HardwareControl) => void;
  onRelease: (control: HardwareControl) => void;
}

/**
 * The device keyboard for touch screens. It crops the real hardware art and lays the same control map over it,
 * so taps go through the same press/release path as the physical keys and light up while held.
 */
export function TouchKeyboard({ dpad, pressedIds, onActivate, onPress, onRelease }: TouchKeyboardProps) {
  const handlers = (control: HardwareControl) => ({
    onPointerDown: () => onPress(control),
    onPointerUp: () => onRelease(control),
    onPointerCancel: () => onRelease(control),
    onPointerLeave: () => onRelease(control),
    onClick: (event: React.MouseEvent) => onActivate(control, event.detail === 0),
    onContextMenu: (event: React.MouseEvent) => event.preventDefault(),
  });
  const state = (control: HardwareControl) => (pressedIds.has(control.id) ? ' is-pressed' : '');
  return <div className="touch-dock" role="group" aria-label="On-screen keyboard">
    {dpad && <div className="touch-arrows">
      {arrows.map(({ id, Icon }) => {
        const control = hardwareControlById.get(id)!;
        return <button key={id} type="button" className={`touch-arrow${state(control)}`} data-control-id={id} aria-label={control.label} {...handlers(control)}><Icon aria-hidden="true"/></button>;
      })}
    </div>}
    <div className="touch-kbd" style={{ '--crop-w': KEYBOARD_CROP.width, '--crop-h': KEYBOARD_CROP.height, '--art-w': DEVICE_REFERENCE.width } as CSSProperties}>
      <img src="/assets/device/generated/device-base-open.png" alt="" aria-hidden="true" draggable={false}
        style={{ left: `${-KEYBOARD_CROP.x / KEYBOARD_CROP.width * 100}%`, top: `${-KEYBOARD_CROP.y / KEYBOARD_CROP.height * 100}%`, width: `${DEVICE_REFERENCE.width / KEYBOARD_CROP.width * 100}%` }}/>
      {keys.map((control) => <button
        key={control.id}
        type="button"
        className={`touch-key${state(control)}`}
        data-control-id={control.id}
        aria-label={control.label}
        style={{
          left: `${(control.x - KEYBOARD_CROP.x) / KEYBOARD_CROP.width * 100}%`,
          top: `${(control.y - KEYBOARD_CROP.y) / KEYBOARD_CROP.height * 100}%`,
          width: `${control.width / KEYBOARD_CROP.width * 100}%`,
          height: `${control.height / KEYBOARD_CROP.height * 100}%`,
        }}
        {...handlers(control)}
      ><i className="key-light" aria-hidden="true"/></button>)}
    </div>
  </div>;
}
