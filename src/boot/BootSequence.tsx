import { useEffect, useRef, useState } from 'react';
import '@fontsource/silkscreen/400.css';
import { playBootChime } from '../audio/bootChime';
import { CANVAS, LINK_RECT, PLATTER_APP_STORE_STATUS, platterAppStoreCopy, START_RECT, type PlatterAppStoreStatus } from './bootConfig';
import { createBootRenderer, FONT_FAMILY } from './bootRender';
import { sceneAt, type BootScene, type BootStage } from './bootScene';

interface BootSequenceProps {
  /** False while the display is still being redrawn: the screen is black and the clock has not started. */
  active: boolean;
  reducedMotion: boolean;
  /** Start was pressed on the Platter card (button or Enter). */
  onStart: () => void;
  /** The Platter card is on screen, so Start is live. */
  onCard: () => void;
  status?: PlatterAppStoreStatus;
}

const pct = (value: number, of: number) => `${(value / of) * 100}%`;
const place = (rect: { x: number; y: number; width: number; height: number }) => ({
  left: pct(rect.x, CANVAS.width), top: pct(rect.y, CANVAS.height), width: pct(rect.width, CANVAS.width), height: pct(rect.height, CANVAS.height),
});

/**
 * The first-visit boot, drawn on a 240x160 canvas (the Sidekick II display) and scaled up with nearest-neighbour.
 * It lives inside the screen layer. The Platter card never advances by itself: only the Start button, Enter or the
 * trackball/D-pad centre (routed here through `onStart` by the dispatcher in useHardwareKeyboard) end it.
 */
export function BootSequence({ active, reducedMotion, onStart, onCard, status = PLATTER_APP_STORE_STATUS }: BootSequenceProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stage, setStage] = useState<BootStage>(reducedMotion ? 'card' : 'backlight');
  const [pressed, setPressed] = useState(false);
  const { line, href } = platterAppStoreCopy(status);
  const callbacks = useRef({ onStart, onCard });
  useEffect(() => { callbacks.current = { onStart, onCard }; });
  const paint = useRef<() => void>(() => undefined);
  const pressedRef = useRef(false);
  const setStartPressed = (next: boolean) => { pressedRef.current = next; setPressed(next); };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderer = createBootRenderer(canvas);
    let frame = 0;
    let started: number | null = null;
    let lastKey = '';
    let chimed = false;
    let scene: BootScene = sceneAt(0, reducedMotion);
    paint.current = () => { lastKey = ''; renderer?.draw(scene, line, pressedRef.current); };
    const run = () => {
      const now = performance.now();
      if (active) started ??= now;
      scene = sceneAt(started === null ? 0 : now - started, reducedMotion);
      if (started !== null) setStage(scene.stage);
      if (scene.stage === 'splash' && !chimed) { chimed = true; playBootChime(); }
      const key = JSON.stringify(scene);
      if (key !== lastKey) { lastKey = key; renderer?.draw(scene, line, pressedRef.current); }
      // The card is a still: it is repainted on demand (a press, the font arriving), not by the clock.
      if (scene.stage !== 'card') frame = requestAnimationFrame(run);
    };
    // Redraw once the pixel font arrives, so the first frame is never in a fallback face.
    void document.fonts?.load(`8px ${FONT_FAMILY}`).then(() => document.fonts.load(`16px ${FONT_FAMILY}`)).then(() => paint.current());
    frame = requestAnimationFrame(run);
    return () => cancelAnimationFrame(frame);
  }, [active, reducedMotion, line]);

  useEffect(() => { paint.current(); }, [pressed]);
  useEffect(() => { if (stage === 'card') callbacks.current.onCard(); }, [stage]);

  // Enter presses Start: key down shows the pressed button, release starts. No other key does anything here.
  useEffect(() => {
    if (stage !== 'card') return;
    let armed = false;
    const ownsKeys = (target: EventTarget | null) => target instanceof HTMLElement && target.closest('[data-boot-link], [data-boot-start]') !== null;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' || event.repeat || event.metaKey || event.ctrlKey || event.altKey || ownsKeys(event.target)) return;
      armed = true;
      setStartPressed(true);
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' || !armed) return;
      armed = false;
      setStartPressed(false);
      callbacks.current.onStart();
    };
    const onBlur = () => { armed = false; setStartPressed(false); };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [stage]);

  const release = () => setStartPressed(false);
  return <div className="boot-seq" data-boot-stage={stage}>
    <div className="boot-seq__lcd">
      <canvas ref={canvasRef} className="boot-seq__canvas" width={CANVAS.width} height={CANVAS.height} aria-hidden="true"/>
      {stage === 'card' && <>
        <a className="boot-seq__link" data-boot-link href={href} target="_blank" rel="noopener noreferrer" style={place(LINK_RECT)}>
          <span className="boot-seq__sr">{line}</span>
        </a>
        <button
          type="button"
          className="boot-seq__start"
          data-boot-start
          style={place(START_RECT)}
          onPointerDown={() => setStartPressed(true)}
          onPointerUp={release}
          onPointerLeave={release}
          onPointerCancel={release}
          onBlur={release}
          onClick={() => callbacks.current.onStart()}
        ><span className="boot-seq__sr">Start</span></button>
      </>}
    </div>
    <p className="boot-seq__sr" role="status">{stage === 'card' ? 'Platter. Save any recipe from Reels, TikTok & blogs. Press Start to continue.' : stage === 'splash' ? 'AsmitOS v2.8 starting' : ''}</p>
  </div>;
}
