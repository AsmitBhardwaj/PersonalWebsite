import { useCallback, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { PhoneDevice, type BootState, type IntroPhase } from './components/device/PhoneDevice';
import { createSwivel, type SwivelController } from './components/device/swivelController';
import { SoundToggle } from './components/ui/SoundToggle';
import { preloadClack } from './audio/clack';
import { hasBooted, markBooted } from './boot/bootSeen';
import './styles/device.css';
import './styles/screen.css';
import './styles/focus.css';
import './styles/hardware-controls.css';
import './styles/hardware-terminal.css';

gsap.registerPlugin(useGSAP);

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function App() {
  const stageRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const swivelRef = useRef<SwivelController | null>(null);
  const [ready, setReady] = useState(false);
  const [booting, setBooting] = useState(false);
  const [introActive, setIntroActive] = useState(true);
  const [introPhase, setIntroPhase] = useState<IntroPhase>('closed');
  const [boot, setBootState] = useState<BootState>('off');
  const bootRef = useRef<BootState>('off');
  /** The first-visit boot follows an opening swivel, not a skipped intro. */
  const allowBootRef = useRef(true);
  const handoffRef = useRef(false);
  const [reducedMotion] = useState(prefersReducedMotion);

  const setBoot = useCallback((next: BootState) => { bootRef.current = next; setBootState(next); }, []);
  /** The display has finished redrawing: the boot screen, lit but black until now, starts its clock. */
  const startBootClock = useCallback(() => { if (bootRef.current === 'pending') setBoot('playing'); }, [setBoot]);

  /** Boot is over (it ran out, or a key, tap or trackball press skipped it): back to home through the redraw dim. */
  const endBoot = useCallback(() => {
    if (bootRef.current === 'off' || handoffRef.current) return;
    const swivel = swivelRef.current;
    if (bootRef.current === 'playing' && swivel && !prefersReducedMotion()) {
      handoffRef.current = true;
      swivel.handoff(() => { handoffRef.current = false; setBoot('off'); });
    } else setBoot('off');
  }, [setBoot]);

  /** The `reboot` command: dim into the boot screen and play the sequence again. */
  const reboot = useCallback(() => {
    if (bootRef.current !== 'off' || handoffRef.current) return;
    const swivel = swivelRef.current;
    if (swivel && !prefersReducedMotion()) {
      handoffRef.current = true;
      swivel.handoff(() => { handoffRef.current = false; setBoot('pending'); }, startBootClock);
    } else setBoot('playing');
  }, [setBoot, startBootClock]);

  /** Skip: straight to the open pose with no animation and no sound. */
  const finishIntro = useCallback((withBoot = false) => {
    const stage = stageRef.current;
    if (!stage) return;
    timelineRef.current?.kill();
    gsap.set(stage.querySelector('.back-wake-glow'), { opacity: 0 });
    gsap.set(stage.querySelector('.notification-led'), { opacity: 0.62, boxShadow: '0 0 5px #8fc8ee' });
    gsap.set(stage.querySelector('.ambient-shadow'), { opacity: 0.78, scaleX: 1.04 });
    setBooting(false); setReady(true); setIntroActive(false);
    allowBootRef.current = withBoot;
    swivelRef.current?.jumpTo('open');
    allowBootRef.current = true;
  }, []);

  /** A visitor asked for the lid to open (click, tap, Enter or Space). A drag reaches the same swivel on its own. */
  const requestOpen = useCallback(() => {
    // Opening before the wake-up has played finishes it first, so the lock screen is lit when the lid turns over.
    timelineRef.current?.totalProgress(1, false);
    swivelRef.current?.open({ user: true });
  }, []);

  useGSAP(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const swivel = createSwivel(stage, {
      onPhase: (phase) => { setIntroPhase(phase); if (phase === 'open') setIntroActive(false); },
      onContent: (face) => {
        setReady(face === 'home');
        if (face === 'home') {
          setBooting(false);
          if (allowBootRef.current && !hasBooted()) { markBooted(); setBoot(prefersReducedMotion() ? 'playing' : 'pending'); }
        } else { handoffRef.current = false; setBoot('off'); }
      },
      onRedrawEnd: (face) => { if (face === 'home') startBootClock(); },
      onBeforeOpen: () => timelineRef.current?.totalProgress(1, false),
    });
    swivelRef.current = swivel;
    if (prefersReducedMotion()) {
      gsap.set(stage, { opacity: 0 });
      finishIntro(true);
      gsap.to(stage, { opacity: 1, duration: 0.15 });
      return () => { swivel.destroy(); swivelRef.current = null; };
    }
    const glass = stage.querySelector('.glass-reflection');
    const led = stage.querySelector('.notification-led');
    const ambient = stage.querySelector('.ambient-shadow');
    const wakeGlow = stage.querySelector('.back-wake-glow');
    const os = stage.querySelector('.phone-os');
    // The wake-up: the lid is shut, the LED and glow come on, the boot screen is lit behind it. Then it waits for a visitor.
    const timeline = gsap.timeline({ defaults: { overwrite: 'auto' } });
    timelineRef.current = timeline;
    timeline
      .set(os, { opacity: 0, filter: 'blur(2px)' })
      .set(wakeGlow, { opacity: 0 })
      .to(led, { opacity: 1, boxShadow: '0 0 9px #8fc8ee', duration: 0.35, ease: 'sine.inOut' }, 0.15)
      .to(glass, { xPercent: 120, duration: 0.48, ease: 'sine.inOut' }, 0.08)
      .call(() => setBooting(true), [], 0.6)
      .call(() => setIntroPhase('wake'), [], 0.76)
      .to(stage.querySelector('.boot-screen'), { opacity: 1, duration: 0.32, ease: 'power1.out' }, 0.63)
      .to(wakeGlow, { opacity: 1, duration: 0.3, ease: 'sine.out' }, 0.63)
      .to(ambient, { opacity: 0.78, scaleX: 1.04, duration: 0.5 }, 0.6);
    return () => { timeline.kill(); swivel.destroy(); swivelRef.current = null; };
  }, { scope: stageRef });

  useEffect(() => {
    preloadClack();
  }, []);

  // Enter or Space with nothing focused opens the lid. A focused control, including the lid's own button, keeps its keys.
  useEffect(() => {
    if (introPhase !== 'closed' && introPhase !== 'wake') return;
    const onKey = (event: KeyboardEvent) => {
      if (event.repeat || event.target !== document.body || (event.key !== 'Enter' && event.key !== ' ')) return;
      event.preventDefault();
      requestOpen();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [introPhase, requestOpen]);

  useEffect(() => {
    const onVisibility = () => { if (document.hidden) timelineRef.current?.pause(); else timelineRef.current?.resume(); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  return <main className="portfolio-stage">
    <a className="skip-link" href="#phone">Skip to portfolio</a>
    <div className="studio-light" aria-hidden="true"/>
    <div id="phone" className="device-wrap"><PhoneDevice ref={stageRef} ready={ready} booting={booting} phase={introPhase} onOpenRequest={requestOpen} boot={boot} bootReducedMotion={reducedMotion} onBootSkip={endBoot} onBootFinish={endBoot} onReboot={reboot}/></div>
    {/* Device-level controls. Music controls are meant to join the sound toggle here. */}
    <div className="device-controls"><SoundToggle/></div>
    {introActive && <button className="skip-intro" onClick={() => finishIntro()}>Skip intro</button>}
    {introPhase === 'open'
      ? <div className="depth-hint" aria-hidden="true"><span/>Explore inside the device</div>
      : introPhase === 'wake' && <button type="button" className="open-prompt" onClick={requestOpen}><i aria-hidden="true"/>Tap, drag or press Enter to open</button>}
  </main>;
}
