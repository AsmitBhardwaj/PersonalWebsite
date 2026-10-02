import { useCallback, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { PhoneDevice, type BootState, type IntroPhase } from './components/device/PhoneDevice';
import { SWIVEL } from './components/device/swivelConfig';
import type { LockRing } from './components/device/LockScreen';
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
  const [introActive, setIntroActive] = useState(true);
  const [introPhase, setIntroPhase] = useState<IntroPhase>('closed');
  const [boot, setBootState] = useState<BootState>('off');
  const bootRef = useRef<BootState>('off');
  /** The first-visit boot follows an opening swivel, not a skipped intro. */
  const allowBootRef = useRef(true);
  const handoffRef = useRef(false);
  /** The Platter card is on screen, so Start can be pressed from the trackball or D-pad. */
  const bootCardRef = useRef(false);
  const [reducedMotion] = useState(prefersReducedMotion);
  /** First visit: the phone is ringing with a message until the lid has been opened (see SWIVEL.ring). */
  const [firstVisit] = useState(() => !hasBooted());
  const [buzzed, setBuzzed] = useState(false);
  const [messageRead, setMessageRead] = useState(false);
  const ring: LockRing = !firstVisit || messageRead ? 'off' : buzzed || reducedMotion ? 'awake' : 'idle';

  const setBoot = useCallback((next: BootState) => { bootRef.current = next; if (next !== 'playing') bootCardRef.current = false; setBootState(next); }, []);
  const onBootCard = useCallback(() => { bootCardRef.current = true; }, []);
  /** The display has finished redrawing: the boot screen, lit but black until now, starts its clock. */
  const startBootClock = useCallback(() => { if (bootRef.current === 'pending') setBoot('playing'); }, [setBoot]);

  /** Start was pressed on the Platter card: the visitor has seen the boot, so flag it, then back to home through the redraw dim. */
  const endBoot = useCallback(() => {
    if (bootRef.current !== 'playing' || !bootCardRef.current || handoffRef.current) return;
    markBooted();
    bootCardRef.current = false;
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

  /** The `close` command: the reverse swivel with its clack. */
  const closeLid = useCallback(() => { swivelRef.current?.close({ user: true }); }, []);

  /** Skip: straight to the open pose with no animation and no sound. */
  const finishIntro = useCallback((withBoot = false) => {
    const stage = stageRef.current;
    if (!stage) return;
    timelineRef.current?.kill();
    gsap.set(stage.querySelector('.lock-screen'), { clearProps: 'opacity' });
    gsap.set(stage.querySelector('.ambient-shadow'), { opacity: 0.78, scaleX: 1.04 });
    setReady(true); setIntroActive(false);
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
      onPhase: (phase) => { setIntroPhase(phase); if (phase === 'open') { setIntroActive(false); setMessageRead(true); } },
      onBuzz: () => setBuzzed(true),
      onContent: (face) => {
        setReady(face === 'home');
        if (face === 'home') {
          if (allowBootRef.current && !hasBooted()) { setBoot(prefersReducedMotion() ? 'playing' : 'pending'); }
        } else { handoffRef.current = false; setBoot('off'); }
      },
      onRedrawEnd: (face) => { if (face === 'home') startBootClock(); },
      onBeforeOpen: () => timelineRef.current?.totalProgress(1, false),
    }, { ring: firstVisit });
    swivelRef.current = swivel;
    // Reduced motion skips the intro and lands on the open device, except on a first visit, which stays on the closed phone to show the message.
    if (prefersReducedMotion() && !firstVisit) {
      gsap.set(stage, { opacity: 0 });
      finishIntro(true);
      gsap.to(stage, { opacity: 1, duration: 0.15 });
      return () => { swivel.destroy(); swivelRef.current = null; };
    }
    const glass = stage.querySelector('.glass-reflection');
    const lock = stage.querySelector('.lock-screen');
    const ambient = stage.querySelector('.ambient-shadow');
    const os = stage.querySelector('.phone-os');
    // The wake-up: the lid is shut and the dim lock screen lights up under the glass. Then it waits for a visitor.
    const timeline = gsap.timeline({ defaults: { overwrite: 'auto' } });
    timelineRef.current = timeline;
    timeline
      .set(os, { opacity: 0, filter: 'blur(2px)' })
      .set(lock, { opacity: 0 })
      .to(lock, { opacity: 1, duration: 0.5, ease: 'sine.inOut' }, 0.15)
      .to(glass, { xPercent: 120, duration: 0.48, ease: 'sine.inOut' }, 0.08)
      .call(() => setIntroPhase('wake'), [], 0.76)
      .to(ambient, { opacity: 0.78, scaleX: 1.04, duration: 0.5 }, 0.6);
    if (prefersReducedMotion()) { timeline.totalProgress(1); setIntroActive(false); }
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
    <div id="phone" className="device-wrap"><PhoneDevice ref={stageRef} ready={ready} ring={ring} phase={introPhase} onOpenRequest={requestOpen} boot={boot} bootReducedMotion={reducedMotion} onBootStart={endBoot} onBootCard={onBootCard} onReboot={reboot} onCloseLid={closeLid}/></div>
    {/* Device-level controls. Music controls are meant to join the sound toggle here. */}
    <div className="device-controls"><SoundToggle/></div>
    {introActive && <button className="skip-intro" onClick={() => finishIntro()}>Skip intro</button>}
    {introPhase === 'open'
      ? <div className="depth-hint" aria-hidden="true"><span/>Explore inside the device</div>
      : introPhase === 'wake' && <button type="button" className="open-prompt" onClick={requestOpen}><i aria-hidden="true"/>{firstVisit && !messageRead ? SWIVEL.ring.pillText : 'Tap, drag or press Enter to open'}</button>}
  </main>;
}
