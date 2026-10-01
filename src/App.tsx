import { useCallback, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { PhoneDevice } from './components/device/PhoneDevice';
import './styles/device.css';
import './styles/screen.css';

gsap.registerPlugin(useGSAP);

export default function App() {
  const stageRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const [ready, setReady] = useState(false);
  const [booting, setBooting] = useState(false);
  const [introActive, setIntroActive] = useState(true);

  const finishIntro = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    timelineRef.current?.kill();
    gsap.set(stage.querySelector('.display-assembly'), { x: 0, yPercent: -16, rotation: 180, scale: 1 });
    gsap.set(stage.querySelector('.screen-viewport'), { rotation: -180 });
    gsap.set(stage.querySelector('.phone-os'), { opacity: 1, filter: 'none' });
    gsap.set(stage.querySelector('.boot-screen'), { opacity: 0 });
    gsap.set(stage.querySelector('.contact-shadow'), { y: -4, scaleX: 1.04, opacity: 0.55 });
    gsap.set(stage.querySelector('.motion-ghost'), { opacity: 0 });
    setBooting(false); setReady(true); setIntroActive(false);
  }, []);

  useGSAP(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      gsap.set(stage, { opacity: 0 });
      finishIntro();
      gsap.to(stage, { opacity: 1, duration: 0.15 });
      return;
    }
    const display = stage.querySelector('.display-assembly');
    const screen = stage.querySelector('.screen-viewport');
    const glass = stage.querySelector('.glass-reflection');
    const led = stage.querySelector('.notification-led');
    const shadow = stage.querySelector('.contact-shadow');
    const ambient = stage.querySelector('.ambient-shadow');
    const ghost = stage.querySelector('.motion-ghost');
    const os = stage.querySelector('.phone-os');
    const timeline = gsap.timeline({ defaults: { overwrite: 'auto' }, onComplete: finishIntro });
    timelineRef.current = timeline;
    timeline
      .set(display, { x: 0, yPercent: 72, rotation: 0, scale: 1 })
      .set(screen, { rotation: 0 })
      .set(os, { opacity: 0, filter: 'blur(2px)' })
      .set(ghost, { opacity: 0 })
      .to(led, { opacity: 1, boxShadow: '0 0 9px #8fc8ee', duration: 0.35, ease: 'sine.inOut' }, 0.15)
      .to(glass, { xPercent: 120, duration: 0.48, ease: 'sine.inOut' }, 0.08)
      .call(() => setBooting(true), [], 0.6)
      .to(stage.querySelector('.boot-screen'), { opacity: 1, duration: 0.32, ease: 'power1.out' }, 0.63)
      .to(ambient, { opacity: 0.78, scaleX: 1.04, duration: 0.5 }, 0.6)
      .to(display, { yPercent: 69, scale: 1.006, duration: 0.12, ease: 'power1.out' }, 1.08)
      .to(ghost, { opacity: 0.18, duration: 0.12 }, 1.15)
      .to(display, { yPercent: -18.2, rotation: 184, duration: 1.2, ease: 'power3.inOut' }, 1.1)
      .to(screen, { rotation: -180, duration: 1.2, ease: 'power3.inOut' }, 1.1)
      .to(shadow, { y: -4, scaleX: 1.08, opacity: 0.62, duration: 1.05, ease: 'power2.inOut' }, 1.18)
      .to(ghost, { opacity: 0, duration: 0.18 }, 1.85)
      .call(() => setReady(true), [], 1.92)
      .to(os, { opacity: 1, filter: 'blur(0px)', duration: 0.42, ease: 'power2.out' }, 1.95)
      .to(stage.querySelector('.boot-screen'), { opacity: 0, duration: 0.22 }, 2.0)
      .to(display, { yPercent: -15.1, rotation: 178.6, duration: 0.18, ease: 'power2.out' }, 2.3)
      .to(display, { yPercent: -16, rotation: 180, duration: 0.26, ease: 'power2.out' }, 2.48)
      .to(shadow, { scaleX: 1.04, opacity: 0.55, duration: 0.3, ease: 'power1.out' }, 2.48)
      .to(led, { opacity: 0.62, boxShadow: '0 0 5px #8fc8ee', duration: 0.25 }, 2.65)
      .to({}, { duration: 0.1 }, 2.9);
    return () => timeline.kill();
  }, { scope: stageRef });

  useEffect(() => {
    const onVisibility = () => { if (document.hidden) timelineRef.current?.pause(); else timelineRef.current?.resume(); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  return <main className="portfolio-stage">
    <a className="skip-link" href="#phone">Skip to portfolio</a>
    <div className="studio-light" aria-hidden="true"/>
    <div id="phone" className="device-wrap"><PhoneDevice ref={stageRef} ready={ready} booting={booting}/></div>
    {introActive && <button className="skip-intro" onClick={finishIntro}>Skip intro</button>}
    <div className="depth-hint" aria-hidden="true"><span/>Explore inside the device</div>
  </main>;
}
