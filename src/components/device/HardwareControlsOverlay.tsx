import { useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type MouseEvent, type PointerEvent } from 'react';
import { DEVICE_REFERENCE, hardwareControls, type HardwareControl } from './hardwareControlMap';

interface HardwareControlsOverlayProps {
  enabled: boolean;
  debug: boolean;
  pressedIds: ReadonlySet<string>;
  onActivate: (control: HardwareControl, fromKeyboard: boolean) => void;
  onPress: (control: HardwareControl) => void;
  onRelease: (control: HardwareControl) => void;
}

function overlaps(first: HardwareControl, second: HardwareControl) {
  return first.x < second.x + second.width && first.x + first.width > second.x
    && first.y < second.y + second.height && first.y + first.height > second.y;
}

function findDirectionalIndex(current: HardwareControl, direction: string) {
  const currentX = current.x + current.width / 2;
  const currentY = current.y + current.height / 2;
  let bestIndex = -1;
  let bestScore = Number.POSITIVE_INFINITY;

  hardwareControls.forEach((candidate, index) => {
    if (candidate.id === current.id) return;
    const x = candidate.x + candidate.width / 2;
    const y = candidate.y + candidate.height / 2;
    const dx = x - currentX;
    const dy = y - currentY;
    if ((direction === 'left' && dx >= 0) || (direction === 'right' && dx <= 0)
      || (direction === 'up' && dy >= 0) || (direction === 'down' && dy <= 0)) return;
    const primary = direction === 'left' || direction === 'right' ? Math.abs(dx) : Math.abs(dy);
    const secondary = direction === 'left' || direction === 'right' ? Math.abs(dy) : Math.abs(dx);
    const score = primary + secondary * 2.4;
    if (score < bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });
  return bestIndex;
}

export function HardwareControlsOverlay({ enabled, debug, pressedIds, onActivate, onPress, onRelease }: HardwareControlsOverlayProps) {
  const [tabIndex, setTabIndex] = useState(0);
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const overlappingIds = useMemo(() => new Set(hardwareControls.flatMap((control, index) =>
    hardwareControls.slice(index + 1).filter((candidate) => overlaps(control, candidate)).flatMap((candidate) => [control.id, candidate.id])
  )), []);

  const onGridKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const directions: Record<string, string> = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };
    const direction = directions[event.key];
    if (!direction) return;
    event.preventDefault();
    const nextIndex = findDirectionalIndex(hardwareControls[tabIndex], direction);
    if (nextIndex < 0) return;
    setTabIndex(nextIndex);
    buttonRefs.current[nextIndex]?.focus();
  };

  const trackPointer = (event: PointerEvent<HTMLDivElement>) => {
    if (!debug) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    setPointer({
      x: Math.round((event.clientX - bounds.left) / bounds.width * DEVICE_REFERENCE.width),
      y: Math.round((event.clientY - bounds.top) / bounds.height * DEVICE_REFERENCE.height),
    });
  };

  const activate = (event: MouseEvent<HTMLButtonElement>, control: HardwareControl) => {
    onActivate(control, event.detail === 0);
    if (event.detail > 0) event.currentTarget.blur();
  };

  return <div
    className={`hardware-controls-overlay${debug ? ' is-debugging' : ''}${enabled ? ' is-enabled' : ''}`}
    role="grid"
    aria-label="Interactive phone keyboard and hardware controls"
    aria-disabled={!enabled}
    onKeyDown={onGridKeyDown}
    onPointerMove={trackPointer}
  >
    {hardwareControls.map((control, index) => {
      const style = {
        '--control-x': `${control.x / DEVICE_REFERENCE.width * 100}%`,
        '--control-y': `${control.y / DEVICE_REFERENCE.height * 100}%`,
        '--control-width': `${control.width / DEVICE_REFERENCE.width * 100}%`,
        '--control-height': `${control.height / DEVICE_REFERENCE.height * 100}%`,
      } as CSSProperties;
      return <button
        ref={(element) => { buttonRefs.current[index] = element; }}
        type="button"
        className={`hardware-control hardware-control--${control.shape ?? 'rounded-rect'}${pressedIds.has(control.id) ? ' is-pressed' : ''}${overlappingIds.has(control.id) ? ' has-overlap' : ''}`}
        style={style}
        key={control.id}
        data-control-id={control.id}
        data-action={control.action}
        data-pressed={pressedIds.has(control.id) || undefined}
        aria-label={control.label}
        disabled={!enabled}
        tabIndex={enabled && index === tabIndex ? 0 : -1}
        onFocus={() => setTabIndex(index)}
        onPointerDown={() => onPress(control)}
        onPointerUp={() => onRelease(control)}
        onPointerCancel={() => onRelease(control)}
        onPointerLeave={() => onRelease(control)}
        onClick={(event) => activate(event, control)}
      ><i className="key-light" aria-hidden="true"/><span>{control.id}</span></button>;
    })}
    {debug && <output className="hardware-pointer-coordinate">x {pointer.x} · y {pointer.y}</output>}
  </div>;
}
