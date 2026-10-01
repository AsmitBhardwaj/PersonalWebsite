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

interface DeviceMetrics { box: Box; onScreen: ScreenPoint; screenHeight: number }

/** Reads the shell's in-device geometry by letting the stylesheet size it, then restores any inline geometry. */
function measureDevice(shell: HTMLElement): DeviceMetrics {
  const saved = GEOMETRY.map((name) => [name, shell.style.getPropertyValue(name)] as const);
  GEOMETRY.forEach((name) => shell.style.removeProperty(name));
  const rect = shell.getBoundingClientRect();
  const box = { left: shell.offsetLeft, top: shell.offsetTop, width: shell.offsetWidth, height: shell.offsetHeight };
  saved.forEach(([name, value]) => { if (value) shell.style.setProperty(name, value); });
  return { box, onScreen: { left: rect.left, top: rect.top, width: rect.width }, screenHeight: rect.height };
}

const viewportSize = () => ({ width: document.documentElement.clientWidth, height: window.innerHeight });
const prefersReducedMotion = () => typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const chromeOf = (shell: HTMLElement) => Array.from(shell.querySelectorAll<HTMLElement>('.screen-content, .screen-nav'));

type Phase = 'off' | 'entering' | 'on' | 'exiting';

interface UseFocusModeOptions {
  shellRef: RefObject<HTMLElement | null>;
  /** Focus mode only applies once the intro has finished. */
  enabled: boolean;
  activeApp: AppId | null;
  closeApp: () => void;
}

/**
 * Lets the screen layer grow out of the device to fill the viewport while an app is open on a small screen.
 * Home and the intro stay in-device. Back, Escape and the browser back gesture all end up in `requestHome`.
 */
export function useFocusMode({ shellRef, enabled, activeApp, closeApp }: UseFocusModeOptions) {
  const [focused, setFocused] = useState(false);
  const phase = useRef<Phase>('off');
  const timeline = useRef<gsap.core.Timeline | null>(null);
  const pushed = useRef(false);
  const ignorePop = useRef(false);
  const closeRef = useRef(closeApp);
  useEffect(() => { closeRef.current = closeApp; });

  const stageOf = (shell: HTMLElement) => shell.closest<HTMLElement>('.device-stage');

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

  const finishEnter = useCallback(() => {
    const shell = shellRef.current;
    const stage = shell && stageOf(shell);
    if (!shell || !stage) return;
    gsap.set(chromeOf(shell), { clearProps: 'opacity' });
    gsap.set(shell, { clearProps: 'opacity' });
    shell.style.removeProperty('--bezel');
    stage.dataset.focus = 'on';
    phase.current = 'on';
    applyBox();
  }, [shellRef, applyBox]);

  const enter = useCallback((animate: boolean) => {
    const shell = shellRef.current;
    const stage = shell && stageOf(shell);
    if (!shell || !stage) return;
    timeline.current?.kill();
    window.scrollTo(0, 0);
    const device = measureDevice(shell);
    const end = viewportBox(device.box, device.onScreen, viewportSize());
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
    }
    if (stage) delete stage.dataset.focus;
    document.documentElement.classList.remove(ROOT_CLASS);
    phase.current = 'off';
    setFocused(false);
    if (closeAfter) closeRef.current();
  }, [shellRef]);

  const exit = useCallback(() => {
    const shell = shellRef.current;
    const stage = shell && stageOf(shell);
    if (!shell || !stage) { finishExit(true); return; }
    if (phase.current === 'exiting') return;
    timeline.current?.kill();
    phase.current = 'exiting';
    stage.dataset.focus = 'exit';
    const device = measureDevice(shell);
    const chrome = chromeOf(shell);
    const bezel = parseFloat(getComputedStyle(stage).getPropertyValue('--focus-bezel')) || 0;
    if (prefersReducedMotion()) {
      timeline.current = gsap.timeline({ onComplete: () => {
        finishExit(true);
        gsap.fromTo(shell, { opacity: 0 }, { opacity: 1, duration: FADE_SECONDS, clearProps: 'opacity' });
      } }).to(shell, { opacity: 0, duration: FADE_SECONDS });
      return;
    }
    timeline.current = gsap.timeline({ onComplete: () => finishExit(true) })
      .to(chrome, { opacity: 0, duration: FADE_SECONDS * 0.75, ease: 'power1.in' })
      .fromTo(shell, { '--bezel': `${bezel}px` }, { ...device.box, '--bezel': '0px', duration: EXIT_SECONDS, ease: 'power3.inOut' }, 0.05);
  }, [shellRef, finishExit]);

  /** Leaves focus without closing the app, e.g. when the window grows large enough to show it in-device. */
  const leaveInstant = useCallback(() => {
    if (pushed.current) { ignorePop.current = true; pushed.current = false; window.history.back(); }
    finishExit(false);
  }, [finishExit]);

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
    if (enabled && phase.current === 'off' && wantsFocus(measureDevice(shell).screenHeight)) enter(true);
  }, [activeApp, enabled, shellRef, enter, leaveInstant]);

  useEffect(() => {
    if (!enabled || !activeApp) return;
    const onResize = () => {
      const shell = shellRef.current;
      if (!shell || phase.current === 'exiting') return;
      if (phase.current === 'entering') return; // finishEnter re-measures
      const small = wantsFocus(measureDevice(shell).screenHeight);
      if (phase.current === 'off' && small) enter(false);
      else if (phase.current === 'on' && !small) leaveInstant();
      else if (phase.current === 'on') applyBox();
    };
    window.addEventListener('resize', onResize);
    window.visualViewport?.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.visualViewport?.removeEventListener('resize', onResize);
    };
  }, [enabled, activeApp, shellRef, enter, leaveInstant, applyBox]);

  useEffect(() => () => {
    timeline.current?.kill();
    document.documentElement.classList.remove(ROOT_CLASS);
  }, []);

  return { focused, requestHome };
}
