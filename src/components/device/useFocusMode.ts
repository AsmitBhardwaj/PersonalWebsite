import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import gsap from 'gsap';
import type { AppId } from '../../apps/types';

/**
 * Below this rendered in-device screen height (px) an open app takes over the viewport.
 * The device caps at ~269px tall on desktop (1120px wide), so this keeps desktop in-device
 * while tablets and phones, where body text drops under ~6px, switch to focus mode.
 */
export const FOCUS_MAX_SCREEN_HEIGHT = 220;

const ROOT_CLASS = 'is-focus-mode';
const ENTER_SECONDS = 0.45;
const EXIT_SECONDS = 0.4;
const FADE_SECONDS = 0.2;
const ZOOM_SECONDS = 0.6;
const GEOMETRY = ['left', 'top', 'width', 'height'] as const;

export interface Box { left: number; top: number; width: number; height: number }
export interface ScreenPoint { left: number; top: number; width: number }

export function wantsFocus(deviceScreenHeight: number): boolean {
  return deviceScreenHeight < FOCUS_MAX_SCREEN_HEIGHT;
}

/**
 * The shell sits inside transformed ancestors, so `position: fixed` cannot be used. This maps the viewport
 * back into the shell's own coordinate space (its offset parent), given where the shell is on screen now.
 * The net ancestor transform is a uniform scale plus translation, so one scale factor is enough.
 */
export function viewportBox(local: Box, onScreen: ScreenPoint, viewport: { width: number; height: number }): Box {
  const scale = onScreen.width / local.width;
  return {
    left: local.left - onScreen.left / scale,
    top: local.top - onScreen.top / scale,
    width: viewport.width / scale,
    height: viewport.height / scale,
  };
}

export type Presentation = 'read' | 'play';
export type OpenMode = 'focus' | 'zoom' | 'none';

/** Fraction of the viewport height the screen fills after a camera zoom, and the widest it may get. */
export const ZOOM_TARGET_HEIGHT = 0.78;
export const ZOOM_MAX_WIDTH = 0.92;

/**
 * How an app opens. Small screens (phones, tablets) always take over the viewport. On desktop, reading apps zoom the
 * camera into the screen, while games stay in-device so the keyboard stays in view.
 */
export function openModeFor(presentation: Presentation, deviceScreenHeight: number): OpenMode {
  if (wantsFocus(deviceScreenHeight)) return 'focus';
  return presentation === 'read' ? 'zoom' : 'none';
}

/** Camera zoom that makes the in-device screen fill the target share of the viewport without overflowing its width. */
export function zoomFor(screen: { width: number; height: number }, viewport: { width: number; height: number }): number {
  return Math.max(1, Math.min(ZOOM_TARGET_HEIGHT * viewport.height / screen.height, ZOOM_MAX_WIDTH * viewport.width / screen.width));
}

interface DeviceMetrics { box: Box; onScreen: ScreenPoint; screenHeight: number }

/** Reads the shell's in-device geometry by letting the stylesheet size it, then restores any inline geometry. */
function measureDevice(shell: HTMLElement): DeviceMetrics {
  const saved = GEOMETRY.map((name) => [name, shell.style.getPropertyValue(name)] as const);
  GEOMETRY.forEach((name) => shell.style.removeProperty(name));
  const rect = shell.getBoundingClientRect();
  const box = { left: shell.offsetLeft, top: shell.offsetTop, width: shell.offsetWidth, height: shell.offsetHeight };
  saved.forEach(([name, value]) => { if (value) shell.style.setProperty(name, value); });
  return { box, onScreen: { left: rect.left, top: rect.top, width: rect.width }, screenHeight: rect.height / zoomOf(shell) };
}

const viewportSize = () => ({ width: document.documentElement.clientWidth, height: window.innerHeight });
const prefersReducedMotion = () => typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const chromeOf = (shell: HTMLElement) => Array.from(shell.querySelectorAll<HTMLElement>('.screen-content, .screen-nav, .touch-dock'));
const wrapperOf = (shell: HTMLElement) => shell.closest<HTMLElement>('.device-wrap');
const zoomOf = (shell: HTMLElement) => {
  const wrapper = wrapperOf(shell);
  return (wrapper && Number(gsap.getProperty(wrapper, 'scale'))) || 1;
};

type Phase = 'off' | 'entering' | 'on' | 'exiting';
type ActiveMode = 'focus' | 'zoom';

interface UseFocusModeOptions {
  shellRef: RefObject<HTMLElement | null>;
  /** Focus and zoom only apply once the intro has finished. */
  enabled: boolean;
  activeApp: AppId | null;
  presentation: Presentation;
  closeApp: () => void;
}

/**
 * Opens apps beyond the device when the in-device screen is too small to use.
 * - focus: the screen layer grows out of the device to fill the viewport (phones, tablets).
 * - zoom: the camera pushes into the screen by scaling the whole device wrapper (desktop, reading apps).
 * Home and the intro stay in-device. Back, Escape and the browser back gesture all end up in `requestHome`.
 */
export function useFocusMode({ shellRef, enabled, activeApp, presentation, closeApp }: UseFocusModeOptions) {
  const [focused, setFocused] = useState(false);
  const phase = useRef<Phase>('off');
  const mode = useRef<ActiveMode | null>(null);
  const timeline = useRef<gsap.core.Timeline | null>(null);
  const pushed = useRef(false);
  const ignorePop = useRef(false);
  const closeRef = useRef(closeApp);
  const presentationRef = useRef(presentation);
  // Bumped when an exit finishes, so an app opened during the zoom-out still gets its own mode.
  const [epoch, setEpoch] = useState(0);
  useEffect(() => { closeRef.current = closeApp; });
  useEffect(() => { presentationRef.current = presentation; }, [presentation]);

  const stageOf = (shell: HTMLElement) => shell.closest<HTMLElement>('.device-stage');
  const attr = () => (mode.current === 'zoom' ? 'zoom' : 'focus');

  const applyBox = useCallback(() => {
    const shell = shellRef.current;
    if (!shell) return;
    const { box, onScreen } = measureDevice(shell);
    const viewport = viewportSize();
    const target = viewportBox(box, onScreen, viewport);
    gsap.set(shell, target);
    // offsetWidth is rounded, which skews the scale by up to a pixel across a phone screen. Nudge by what is left over.
    const scale = onScreen.width / box.width;
    const rect = shell.getBoundingClientRect();
    gsap.set(shell, {
      left: target.left - rect.left / scale,
      top: target.top - rect.top / scale,
      width: target.width + (viewport.width - rect.width) / scale,
      height: target.height + (viewport.height - rect.height) / scale,
    });
  }, [shellRef]);

  /** Zoom values that centre the screen in the viewport. Measured with the current zoom removed. */
  const zoomTarget = useCallback(() => {
    const shell = shellRef.current;
    const wrapper = shell && wrapperOf(shell);
    if (!shell || !wrapper) return null;
    gsap.set(wrapper, { x: 0, y: 0, scale: 1 });
    const viewport = viewportSize();
    const wrap = wrapper.getBoundingClientRect();
    const rect = shell.getBoundingClientRect();
    const centre = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    return {
      wrapper,
      origin: `${centre.x - wrap.left}px ${centre.y - wrap.top}px`,
      x: viewport.width / 2 - centre.x,
      y: viewport.height / 2 - centre.y,
      scale: zoomFor(rect, viewport),
    };
  }, [shellRef]);

  const applyZoom = useCallback(() => {
    const target = zoomTarget();
    if (target) gsap.set(target.wrapper, { transformOrigin: target.origin, x: target.x, y: target.y, scale: target.scale });
  }, [zoomTarget]);

  const finishEnter = useCallback(() => {
    const shell = shellRef.current;
    const stage = shell && stageOf(shell);
    if (!shell || !stage) return;
    gsap.set(chromeOf(shell), { clearProps: 'opacity' });
    gsap.set(shell, { clearProps: 'opacity' });
    shell.style.removeProperty('--bezel');
    const wrapper = wrapperOf(shell);
    if (wrapper) gsap.set(wrapper, { clearProps: 'opacity' });
    stage.dataset[attr()] = 'on';
    phase.current = 'on';
    if (mode.current === 'zoom') applyZoom(); else applyBox();
  }, [shellRef, applyBox, applyZoom]);

  const enterZoom = useCallback((animate: boolean) => {
    const shell = shellRef.current;
    const stage = shell && stageOf(shell);
    if (!shell || !stage) return;
    timeline.current?.kill();
    window.scrollTo(0, 0);
    mode.current = 'zoom';
    phase.current = 'entering';
    stage.dataset.zoom = 'enter';
    document.documentElement.classList.add(ROOT_CLASS);
    const target = zoomTarget();
    if (!target) return;
    const { wrapper } = target;
    gsap.set(wrapper, { transformOrigin: target.origin });
    if (!animate) { gsap.set(wrapper, { x: target.x, y: target.y, scale: target.scale }); finishEnter(); return; }
    if (prefersReducedMotion()) {
      gsap.set(wrapper, { x: target.x, y: target.y, scale: target.scale });
      timeline.current = gsap.timeline({ onComplete: finishEnter }).fromTo(wrapper, { opacity: 0 }, { opacity: 1, duration: FADE_SECONDS });
      return;
    }
    timeline.current = gsap.timeline({ onComplete: finishEnter })
      .to(wrapper, { x: target.x, y: target.y, scale: target.scale, duration: ZOOM_SECONDS, ease: 'power3.inOut' });
  }, [shellRef, zoomTarget, finishEnter]);

  const enterFocus = useCallback((animate: boolean) => {
    const shell = shellRef.current;
    const stage = shell && stageOf(shell);
    if (!shell || !stage) return;
    timeline.current?.kill();
    window.scrollTo(0, 0);
    const device = measureDevice(shell);
    const end = viewportBox(device.box, device.onScreen, viewportSize());
    mode.current = 'focus';
    phase.current = 'entering';
    stage.dataset.focus = 'enter';
    document.documentElement.classList.add(ROOT_CLASS);
    setFocused(true);
    if (!pushed.current) { window.history.pushState({ sidekickFocus: true }, ''); pushed.current = true; }
    if (!animate) { gsap.set(shell, end); finishEnter(); return; }
    const chrome = chromeOf(shell);
    const bezel = parseFloat(getComputedStyle(stage).getPropertyValue('--focus-bezel')) || 0;
    if (prefersReducedMotion()) {
      gsap.set(shell, end);
      timeline.current = gsap.timeline({ onComplete: finishEnter }).fromTo(shell, { opacity: 0 }, { opacity: 1, duration: FADE_SECONDS });
      return;
    }
    gsap.set(shell, { ...device.box, '--bezel': '0px' });
    gsap.set(chrome, { opacity: 0 });
    timeline.current = gsap.timeline({ onComplete: finishEnter })
      .to(shell, { ...end, '--bezel': `${bezel}px`, duration: ENTER_SECONDS, ease: 'power3.inOut' })
      .to(chrome, { opacity: 1, duration: FADE_SECONDS, ease: 'power1.out' }, ENTER_SECONDS - FADE_SECONDS);
  }, [shellRef, finishEnter]);

  const finishExit = useCallback((closeAfter: boolean) => {
    const shell = shellRef.current;
    const stage = shell && stageOf(shell);
    timeline.current?.kill();
    if (shell) {
      gsap.set(chromeOf(shell), { clearProps: 'opacity' });
      gsap.set(shell, { clearProps: 'opacity' });
      GEOMETRY.forEach((name) => shell.style.removeProperty(name));
      shell.style.removeProperty('--bezel');
      const wrapper = wrapperOf(shell);
      if (wrapper) gsap.set(wrapper, { clearProps: 'transform,transformOrigin,opacity' });
    }
    if (stage) { delete stage.dataset.focus; delete stage.dataset.zoom; }
    document.documentElement.classList.remove(ROOT_CLASS);
    phase.current = 'off';
    mode.current = null;
    setFocused(false);
    setEpoch((n) => n + 1);
    if (closeAfter) closeRef.current();
  }, [shellRef]);

  const exit = useCallback(() => {
    const shell = shellRef.current;
    const stage = shell && stageOf(shell);
    if (!shell || !stage) { finishExit(true); return; }
    if (phase.current === 'exiting') return;
    timeline.current?.kill();
    phase.current = 'exiting';
    stage.dataset[attr()] = 'exit';
    const reduced = prefersReducedMotion();
    const fadeOut = (target: HTMLElement, closeAfter = true) => {
      timeline.current = gsap.timeline({ onComplete: () => {
        finishExit(closeAfter);
        gsap.fromTo(target, { opacity: 0 }, { opacity: 1, duration: FADE_SECONDS, clearProps: 'opacity' });
      } }).to(target, { opacity: 0, duration: FADE_SECONDS });
    };
    if (mode.current === 'zoom') {
      const wrapper = wrapperOf(shell);
      if (!wrapper) { finishExit(true); return; }
      // Home shows straight away so typing is never swallowed by the closing app while the camera pulls back.
      closeRef.current();
      if (reduced) { fadeOut(wrapper, false); return; }
      timeline.current = gsap.timeline({ onComplete: () => finishExit(false) })
        .to(wrapper, { x: 0, y: 0, scale: 1, duration: ZOOM_SECONDS, ease: 'power3.inOut' });
      return;
    }
    if (reduced) { fadeOut(shell); return; }
    const device = measureDevice(shell);
    const bezel = parseFloat(getComputedStyle(stage).getPropertyValue('--focus-bezel')) || 0;
    timeline.current = gsap.timeline({ onComplete: () => finishExit(true) })
      .to(chromeOf(shell), { opacity: 0, duration: FADE_SECONDS * 0.75, ease: 'power1.in' })
      .fromTo(shell, { '--bezel': `${bezel}px` }, { ...device.box, '--bezel': '0px', duration: EXIT_SECONDS, ease: 'power3.inOut' }, 0.05);
  }, [shellRef, finishExit]);

  /** Leaves the current mode without closing the app, e.g. when the window size calls for a different mode. */
  const leaveInstant = useCallback(() => {
    if (pushed.current) { ignorePop.current = true; pushed.current = false; window.history.back(); }
    finishExit(false);
  }, [finishExit]);

  const enter = useCallback((next: OpenMode, animate: boolean) => {
    if (next === 'focus') enterFocus(animate);
    else if (next === 'zoom') enterZoom(animate);
  }, [enterFocus, enterZoom]);

  const requestHome = useCallback(() => {
    if (phase.current === 'off') { closeRef.current(); return; }
    if (phase.current === 'exiting') return;
    // Let the history pop drive the exit so the browser back stack stays in step with the screen.
    if (pushed.current) { window.history.back(); return; }
    exit();
  }, [exit]);

  useEffect(() => {
    const onPop = () => {
      if (ignorePop.current) { ignorePop.current = false; return; }
      if (!pushed.current) return;
      pushed.current = false;
      if (phase.current === 'entering' || phase.current === 'on') exit();
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [exit]);

  useLayoutEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;
    if (!activeApp) {
      if (phase.current === 'entering' || phase.current === 'on') leaveInstant();
      return;
    }
    if (!enabled || phase.current !== 'off') return;
    enter(openModeFor(presentation, measureDevice(shell).screenHeight), true);
  }, [activeApp, enabled, epoch, presentation, shellRef, enter, leaveInstant]);

  useEffect(() => {
    if (!enabled || !activeApp) return;
    const onResize = () => {
      const shell = shellRef.current;
      if (!shell || phase.current === 'exiting' || phase.current === 'entering') return; // finishEnter re-measures
      const wanted = openModeFor(presentationRef.current, measureDevice(shell).screenHeight);
      const current: OpenMode = mode.current ?? 'none';
      if (wanted !== current) {
        if (phase.current === 'on') leaveInstant();
        enter(wanted, false);
      } else if (phase.current === 'on') {
        if (current === 'zoom') applyZoom(); else applyBox();
      }
    };
    window.addEventListener('resize', onResize);
    window.visualViewport?.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.visualViewport?.removeEventListener('resize', onResize);
    };
  }, [enabled, activeApp, shellRef, enter, leaveInstant, applyBox, applyZoom]);

  useEffect(() => () => {
    timeline.current?.kill();
    document.documentElement.classList.remove(ROOT_CLASS);
  }, []);

  return { focused, requestHome };
}
