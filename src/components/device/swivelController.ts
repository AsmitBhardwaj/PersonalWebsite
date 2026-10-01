import gsap from 'gsap';
import { playClack } from '../../audio/clack';
import { SWIVEL } from './swivelConfig';
import {
  SWING_TRAVEL, SWIVEL_REST, angleAtDistance, distanceAtAngle, glareTransform, poseAt, recoilDirection, shouldComplete,
  swivelEase, timeAtDistance, type Layer, type Point, type Size,
} from './swivelMotion';

export type SwivelPhase = 'wake' | 'swivel' | 'mid-swivel' | 'enter' | 'open';
export type Face = 'home' | 'lock';
export type Rest = 'closed' | 'open';

export interface SwivelHooks {
  onPhase: (phase: SwivelPhase) => void;
  /** The display content changes hands (lock <-> home). Called inside the dim, never in view. */
  onContent: (face: Face) => void;
  /** A visitor-driven open is about to start. The page uses it to finish its wake-up animation first. */
  onBeforeOpen?: () => void;
  /** The redraw dim has finished fading back in on `face`. */
  onRedrawEnd?: (face: Face) => void;
}

export interface SwivelController {
  readonly rest: Rest;
  readonly busy: boolean;
  open: (options?: { user?: boolean }) => void;
  close: (options?: { user?: boolean }) => void;
  /** Snaps straight to a rest pose with no animation. `announce` reports the phase to the page. */
  jumpTo: (rest: Rest, announce?: boolean) => void;
  /** Runs `swap` inside the display-redraw dim, then `onEnd` once the display has faded back in. Both run at once if the swivel is mid-motion. */
  handoff: (swap: () => void, onEnd?: () => void) => void;
  destroy: () => void;
}

const { pose: POSE, swing: SWING, drag: DRAG, recoil: RECOIL, redraw: REDRAW } = SWIVEL;
const REST_ANGLE: Record<Rest, number> = { closed: SWIVEL_REST.closed, open: SWIVEL_REST.open };
const seconds = (ms: number) => ms / 1000;
const prefersReducedMotion = () => typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const rotate = (p: Point, deg: number): Point => {
  const c = Math.cos(deg * Math.PI / 180);
  const s = Math.sin(deg * Math.PI / 180);
  return { x: p.x * c - p.y * s, y: p.x * s + p.y * c };
};
const layerTransform = (layer: Layer) => `translate3d(${layer.x}%, ${layer.y}%, 0) scale(${layer.scale})`;

interface DragState {
  id: number;
  dir: 1 | -1;
  start: Point;
  startAngle: number;
  /** The grabbed point of the screen layer, relative to the hinge, before any rotation. */
  grab: Point;
  moved: boolean;
}

/**
 * Owns the screen layer's transform. One `render(angle)` places every moving part for an angle, and the swing, the
 * settle, the drag and the spring-back all just feed it angles. Only transform, opacity and filter are written.
 * The camera zoom moves the wrapper above this, so the two never share an element.
 */
export function createSwivel(stage: HTMLElement, hooks: SwivelHooks): SwivelController {
  const find = (selector: string) => stage.querySelector<HTMLElement>(selector);
  const display = find('.display-assembly');
  const back = find('.display-back');
  const front = find('.display-front-face');
  const phone = find('.phone');
  const ghost = find('.motion-ghost');
  const contact = find('.contact-shadow');
  const shadow = find('.swivel-shadow');
  const shadowTight = find('.swivel-shadow__layer--tight');
  const shadowSoft = find('.swivel-shadow__layer--soft');
  const glare = find('.glass-glare i');
  const viewport = find('.screen-viewport');
  const os = find('.phone-os');
  const overlay = find('.hardware-controls-overlay');
  if (!display || !back || !front || !phone || !ghost || !contact || !shadow || !shadowTight || !shadowSoft || !glare || !viewport || !os) {
    throw new Error('Swivel: device markup is missing a layer');
  }

  let angle = REST_ANGLE.closed;
  let rest: Rest = 'closed';
  let busy = false;
  let ghostOn = true;
  let drag: DragState | null = null;
  let active: gsap.core.Animation[] = [];
  let size: Size = { w: display.offsetWidth, h: display.offsetHeight };
  const recoilTargets = [phone, overlay].filter((node): node is HTMLElement => Boolean(node));

  const measure = () => { size = { w: display.offsetWidth, h: display.offsetHeight }; };
  const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
  observer?.observe(display);

  /** Places every moving part for a screen angle. The leftover lid ghost is a swing flourish, so a hand-held lid skips it. */
  function render(next: number) {
    angle = next;
    const pose = poseAt(next);
    display!.style.transform = `translate3d(0, ${pose.yPercent}%, 0) rotate(${pose.rotation}deg) scale(${pose.scale})`;
    shadow!.style.transform = `translate3d(0, ${pose.yPercent}%, 0) rotate(${pose.rotation}deg)`;
    shadowTight!.style.transform = layerTransform(pose.shadowTight);
    shadowTight!.style.opacity = String(pose.shadowTight.opacity);
    shadowSoft!.style.transform = layerTransform(pose.shadowSoft);
    shadowSoft!.style.opacity = String(pose.shadowSoft.opacity);
    back!.style.opacity = String(pose.backOpacity);
    front!.style.opacity = String(pose.frontOpacity);
    ghost!.style.opacity = String(ghostOn ? pose.ghostOpacity : 0);
    contact!.style.transform = `translate3d(0, ${pose.contact.y}px, 0) scaleX(${pose.contact.scaleX})`;
    contact!.style.opacity = String(pose.contact.opacity);
    const sheen = glareTransform(next, size);
    glare!.style.transform = `translate(-50%, -50%) translate3d(${sheen.x}px, ${sheen.y}px, 0) rotate(${sheen.rotation}deg)`;
  }

  const setRecoil = (x: number) => recoilTargets.forEach((node) => { node.style.transform = x ? `translate3d(${x}px, 0, 0)` : ''; });
  const setMoving = (moving: boolean) => { if (moving) stage.dataset.swiveling = 'true'; else delete stage.dataset.swiveling; };

  function swapContent(face: Face) {
    gsap.set(os, { opacity: face === 'home' ? 1 : 0, filter: 'none' });
    hooks.onContent(face);
  }

  function stopAll() {
    active.forEach((animation) => animation.kill());
    active = [];
    gsap.killTweensOf(stage);
    gsap.killTweensOf(viewport);
  }
  const track = <T extends gsap.core.Animation>(animation: T): T => { active.push(animation); return animation; };

  function settleAt(next: Rest, phase: SwivelPhase | null) {
    stopAll();
    rest = next;
    busy = false;
    ghostOn = true;
    render(REST_ANGLE[next]);
    setRecoil(0);
    setMoving(false);
    gsap.set(viewport, { clearProps: 'opacity' });
    if (phase) hooks.onPhase(phase);
  }

  /** The display going near-black and coming back with the other face, like an OS re-orienting. */
  function dimThrough(swap: () => void, onEnd?: () => void): gsap.core.Timeline {
    return gsap.timeline({ onComplete: onEnd })
      .to(viewport, { opacity: REDRAW.dimLevel, duration: seconds(REDRAW.dimInMs), ease: 'power1.in' })
      .call(swap)
      .to(viewport, { opacity: REDRAW.dimLevel, duration: seconds(REDRAW.dimMs - REDRAW.dimInMs) })
      .to(viewport, { opacity: 1, duration: seconds(REDRAW.fadeInMs), ease: 'power2.out', clearProps: 'opacity' });
  }
  const redraw = (face: Face) => dimThrough(() => swapContent(face), () => hooks.onRedrawEnd?.(face));

  /** A short kick of the whole device body, opposite to the swing, easing back. */
  function recoil(direction: number): gsap.core.Timeline {
    const kick = { x: 0 };
    return gsap.timeline()
      .to(kick, { x: direction * RECOIL.distancePx, duration: seconds(RECOIL.hitMs), ease: 'power2.out', onUpdate: () => setRecoil(kick.x) })
      .to(kick, { x: 0, duration: seconds(RECOIL.settleMs), ease: 'power2.out', onUpdate: () => setRecoil(kick.x) });
  }

  const wantsClack = (dir: 1 | -1) => (dir > 0 ? SWIVEL.sound.onOpen : SWIVEL.sound.onClose);

  /** The stop: overshoot settles back, the body recoils, the clack fires, and an opening swivel redraws the display. */
  function snap(dir: 1 | -1, user: boolean) {
    const target: Rest = dir > 0 ? 'open' : 'closed';
    hooks.onPhase('enter');
    if (user && wantsClack(dir)) playClack();
    const settle = { a: angleAtDistance(SWING_TRAVEL, dir) };
    const timeline = track(gsap.timeline({ onComplete: () => settleAt(target, dir > 0 ? 'open' : 'wake') }));
    timeline.to(settle, { a: REST_ANGLE[target], duration: seconds(SWING.settleMs), ease: 'power2.out', onUpdate: () => render(settle.a) }, 0);
    timeline.add(recoil(recoilDirection(dir, REST_ANGLE[target])), 0);
    if (dir > 0) timeline.add(redraw('home'), 0);
  }

  /** Runs the swing from `from` to the overshoot peak, joining the velocity curve at the matching point. */
  function swing(dir: 1 | -1, from: number, user: boolean) {
    stopAll();
    busy = true;
    setMoving(true);
    hooks.onPhase('swivel');
    if (dir < 0) track(redraw('lock'));
    const t0 = timeAtDistance(distanceAtAngle(from, dir));
    const progress = { t: t0 };
    let crossedMiddle = false;
    track(gsap.to(progress, {
      t: 1,
      duration: seconds(SWING.durationMs) * (1 - t0),
      ease: 'none',
      onUpdate: () => {
        const next = angleAtDistance(SWING_TRAVEL * swivelEase(progress.t), dir);
        render(next);
        if (!crossedMiddle && (dir > 0 ? next >= 90 : next <= 90)) { crossedMiddle = true; hooks.onPhase('mid-swivel'); }
      },
      onComplete: () => snap(dir, user),
    }));
  }

  /** Reduced motion: no swing, recoil, lift or glare movement, just a quick crossfade between the two poses. */
  function crossfade(dir: 1 | -1, user: boolean) {
    const target: Rest = dir > 0 ? 'open' : 'closed';
    stopAll();
    busy = true;
    hooks.onPhase('swivel');
    if (user && wantsClack(dir)) playClack();
    const half = seconds(SWIVEL.reducedFadeMs) / 2;
    track(gsap.timeline({ onComplete: () => { gsap.set(stage, { clearProps: 'opacity' }); settleAt(target, dir > 0 ? 'open' : 'wake'); } })
      .to(stage, { opacity: 0, duration: half })
      .call(() => { render(REST_ANGLE[target]); swapContent(dir > 0 ? 'home' : 'lock'); })
      .to(stage, { opacity: 1, duration: half }));
  }

  function springBack(from: Rest) {
    stopAll();
    busy = true;
    const state = { a: angle };
    const target = REST_ANGLE[from];
    track(gsap.to(state, {
      a: target,
      duration: seconds(SWING.springBackMs),
      ease: `back.out(${SWING.springBackOvershoot})`,
      onUpdate: () => render(state.a),
      onComplete: () => settleAt(from, from === 'open' ? 'open' : 'wake'),
    }));
  }

  function run(dir: 1 | -1, user: boolean, from?: number) {
    if (prefersReducedMotion()) crossfade(dir, user);
    else swing(dir, from ?? REST_ANGLE[dir > 0 ? 'closed' : 'open'], user);
  }

  /* ---- dragging ---- */

  const hinge = (): Point => {
    const box = stage.getBoundingClientRect();
    const k = box.width / (stage.offsetWidth || box.width);
    return { x: box.left + (display.offsetLeft + size.w / 2) * k, y: box.top + (display.offsetTop + POSE.originY * size.h) * k };
  };
  const hingeShift = (a: number) => ((POSE.closedYPercent + (POSE.openYPercent - POSE.closedYPercent) * (a / POSE.openAngle)) / 100) * size.h;

  /** Where a grabbed point of the screen layer sits in the viewport when the layer is turned to `a`. */
  function worldOf(grab: Point, a: number, anchor: Point): Point {
    const turned = rotate(grab, a);
    return { x: anchor.x + turned.x, y: anchor.y + hingeShift(a) + turned.y };
  }

  /** The angle that puts the grabbed point nearest the pointer, searched near the current angle so it never jumps branches. */
  function angleForPointer(drag: DragState, pointer: Point): number {
    const anchor = hinge();
    const cost = (a: number) => { const p = worldOf(drag.grab, a, anchor); return (p.x - pointer.x) ** 2 + (p.y - pointer.y) ** 2; };
    const search = (centre: number, radius: number, step: number) => {
      let best = Math.min(POSE.openAngle, Math.max(POSE.closedAngle, centre));
      let bestCost = cost(best);
      for (let a = Math.max(POSE.closedAngle, centre - radius); a <= Math.min(POSE.openAngle, centre + radius); a += step) {
        const c = cost(a);
        if (c < bestCost) { best = a; bestCost = c; }
      }
      return best;
    };
    return search(search(angle, 60, 1), 1, 0.05);
  }

  const canGrab = (target: EventTarget | null): boolean => {
    if (busy) return false;
    if (rest === 'closed') return true;
    // Open: the glass belongs to the apps. Only the bezel grabs, and only from the home screen.
    if (stage.dataset.hasApp === 'true' || stage.dataset.focus || stage.dataset.zoom) return false;
    return !(target instanceof Element && target.closest('.screen-shell'));
  };

  function onPointerDown(event: PointerEvent) {
    if (drag || (event.pointerType === 'mouse' && event.button !== 0) || !canGrab(event.target)) return;
    const dir: 1 | -1 = rest === 'closed' ? 1 : -1;
    const start = { x: event.clientX, y: event.clientY };
    const anchor = hinge();
    const offset = { x: start.x - anchor.x, y: start.y - anchor.y - hingeShift(angle) };
    drag = { id: event.pointerId, dir, start, startAngle: angle, grab: rotate(offset, -angle), moved: false };
    display!.setPointerCapture?.(event.pointerId);
  }

  function onPointerMove(event: PointerEvent) {
    if (!drag || event.pointerId !== drag.id) return;
    if (!drag.moved) {
      if (Math.hypot(event.clientX - drag.start.x, event.clientY - drag.start.y) < DRAG.tapSlopPx) return;
      if (drag.dir > 0) hooks.onBeforeOpen?.();
      drag.moved = true;
      busy = true;
      ghostOn = false;
      setMoving(true);
      hooks.onPhase('swivel');
    }
    event.preventDefault();
    render(angleForPointer(drag, { x: event.clientX, y: event.clientY }));
  }

  function endDrag(event: PointerEvent, cancelled: boolean) {
    if (!drag || event.pointerId !== drag.id) return;
    const finished = drag;
    drag = null;
    display!.releasePointerCapture?.(event.pointerId);
    if (!finished.moved) {
      if (!cancelled && finished.dir > 0) api.open({ user: true });
      return;
    }
    if (!cancelled && shouldComplete(angle, finished.dir)) run(finished.dir, true, angle);
    else springBack(finished.dir > 0 ? 'closed' : 'open');
  }
  const onPointerUp = (event: PointerEvent) => endDrag(event, false);
  const onPointerCancel = (event: PointerEvent) => endDrag(event, true);

  display.addEventListener('pointerdown', onPointerDown);
  display.addEventListener('pointermove', onPointerMove);
  display.addEventListener('pointerup', onPointerUp);
  display.addEventListener('pointercancel', onPointerCancel);

  render(REST_ANGLE.closed);

  const api: SwivelController = {
    get rest() { return rest; },
    get busy() { return busy; },
    open({ user = true } = {}) {
      if (busy || rest === 'open') return;
      hooks.onBeforeOpen?.();
      run(1, user);
    },
    close({ user = true } = {}) {
      if (busy || rest === 'closed') return;
      run(-1, user);
    },
    jumpTo(next, announce = true) {
      drag = null;
      settleAt(next, announce ? (next === 'open' ? 'open' : 'wake') : null);
      if (next === 'open') swapContent('home');
    },
    handoff(swap, onEnd) {
      if (busy) { swap(); onEnd?.(); return; }
      track(dimThrough(swap, onEnd));
    },
    destroy() {
      stopAll();
      observer?.disconnect();
      display.removeEventListener('pointerdown', onPointerDown);
      display.removeEventListener('pointermove', onPointerMove);
      display.removeEventListener('pointerup', onPointerUp);
      display.removeEventListener('pointercancel', onPointerCancel);
      setRecoil(0);
      setMoving(false);
    },
  };
  return api;
}
