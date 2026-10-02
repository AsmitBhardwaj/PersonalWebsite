import { useEffect, useRef, useState } from 'react';
import '@fontsource/pixelify-sans/400.css';
import { CANVAS } from '../../boot/bootConfig';
import { FONT_LOADS } from '../../boot/bootRender';
import { createLockRenderer, lockFace, type LockRenderer } from '../../boot/lockRender';
import { SWIVEL } from './swivelConfig';

const TICK_MS = 1000;
const { ring: RING } = SWIVEL;
const prefersReducedMotion = () => typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** What a first visit adds to the lock screen: `idle` is dimmed, `awake` has been buzzed, and `notice` is the message card. */
export type LockRing = 'off' | 'idle' | 'awake';

/**
 * The dim screen of the shut device, drawn like the boot screens: a 480x320 pixel canvas scaled with nearest-neighbour.
 * The lid is turned half a turn when closed, so the content is turned back to read upright there, and it keeps turning
 * with the lid during a swivel (see `.lock-screen` in screen.css). It is swapped out for the home screen inside the
 * redraw dim at the end of an opening swivel.
 */
export function LockScreen({ on, ring = 'off' }: { on: boolean; ring?: LockRing }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [face, setFace] = useState(() => lockFace());
  const rendererRef = useRef<LockRenderer | null>(null);
  const awake = ring === 'awake';
  // The card slides in over a few hard steps, like the rest of the pixel display. Reduced motion shows it in place.
  const [slide, setSlide] = useState(() => (awake && prefersReducedMotion() ? 1 : 0));
  useEffect(() => {
    if (!awake) { setSlide(0); return; }
    if (prefersReducedMotion()) { setSlide(1); return; }
    let step = 0;
    const id = window.setInterval(() => {
      step += 1;
      setSlide(Math.min(1, step / RING.slideSteps));
      if (step >= RING.slideSteps) window.clearInterval(id);
    }, RING.slideMs / RING.slideSteps);
    return () => window.clearInterval(id);
  }, [awake]);
  const notice = awake && slide > 0 ? { ...RING.notification, slide } : null;

  useEffect(() => {
    if (!on) return;
    const update = () => setFace((current) => { const next = lockFace(); return next.time === current.time && next.date === current.date ? current : next; });
    update();
    const id = window.setInterval(update, TICK_MS);
    return () => window.clearInterval(id);
  }, [on]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderer = rendererRef.current ?? createLockRenderer(canvas);
    rendererRef.current = renderer;
    renderer?.draw(face, notice);
    // Redraw once the pixel font arrives, so the first frame is never in a fallback face.
    let live = true;
    void Promise.all(FONT_LOADS.map((font) => document.fonts?.load(font))).then(() => { if (live) renderer?.draw(face, notice); });
    return () => { live = false; };
  }, [face, notice?.slide]); // eslint-disable-line react-hooks/exhaustive-deps -- the notice text is constant

  const brightness = ring === 'idle' ? RING.idleBrightness : RING.awakeBrightness;
  return <div className="lock-screen" data-on={on} data-ring={ring} data-notice={awake} aria-hidden="true" style={{ '--lock-brightness': brightness, '--lock-wake-ms': `${prefersReducedMotion() ? 0 : RING.wakeMs}ms` } as React.CSSProperties}>
    <div className="lock-screen__lcd">
      <canvas ref={canvasRef} className="lock-screen__canvas" width={CANVAS.width} height={CANVAS.height}/>
    </div>
    <span className="lock-screen__sr">{face.time} {face.date}{awake && ` ${RING.notification.title} ${RING.notification.body}`}</span>
  </div>;
}
