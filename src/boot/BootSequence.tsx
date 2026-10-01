import { useEffect, useRef, useState } from 'react';
import '@fontsource/silkscreen/400.css';
import { playBootChime } from '../audio/bootChime';
import { CANVAS, LINK_RECT, PLATTER_APP_STORE_STATUS, platterAppStoreCopy, type PlatterAppStoreStatus } from './bootConfig';
import { createBootRenderer, FONT_FAMILY } from './bootRender';
import { sceneAt, type BootStage } from './bootScene';

interface BootSequenceProps {
  /** False while the display is still being redrawn: the screen is black and the clock has not started. */
  active: boolean;
  reducedMotion: boolean;
  /** The sequence ran its course. */
  onFinish: () => void;
  /** A key, tap or trackball press asked to skip to home. */
  onSkip: () => void;
  status?: PlatterAppStoreStatus;
}

const SKIP_IGNORED_KEYS = new Set(['Tab', 'Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'AltGraph', 'Dead']);
const pct = (value: number, of: number) => `${(value / of) * 100}%`;

/**
 * The first-visit boot, drawn on a 240x160 canvas (the Sidekick II display) and scaled up with nearest-neighbour.
 * It lives inside the screen layer and owns no input beyond "skip": the dispatcher in useHardwareKeyboard stands down while it runs.
 */
export function BootSequence({ active, reducedMotion, onFinish, onSkip, status = PLATTER_APP_STORE_STATUS }: BootSequenceProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stage, setStage] = useState<BootStage>(reducedMotion ? 'card' : 'backlight');
  const { line, href } = platterAppStoreCopy(status);
  const callbacks = useRef({ onFinish, onSkip });
  useEffect(() => { callbacks.current = { onFinish, onSkip }; });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderer = createBootRenderer(canvas);
    let frame = 0;
    let finished = false;
    let started: number | null = null;
    let lastKey = '';
    let chimed = false;
    const run = () => {
      const now = performance.now();
      if (active) started ??= now;
      const scene = sceneAt(started === null ? 0 : now - started, reducedMotion);
      if (started !== null) setStage(scene.stage);
      if (scene.stage === 'splash' && !chimed) { chimed = true; playBootChime(); }
      const key = JSON.stringify(scene);
      if (key !== lastKey) { lastKey = key; renderer?.draw(scene, line); }
      if (scene.stage === 'done') {
        if (!finished) { finished = true; callbacks.current.onFinish(); }
        return;
      }
      frame = requestAnimationFrame(run);
    };
    // Redraw once the pixel font arrives, so the first frame is never in a fallback face.
    void document.fonts?.load(`8px ${FONT_FAMILY}`).then(() => document.fonts.load(`16px ${FONT_FAMILY}`)).then(() => { lastKey = ''; });
    frame = requestAnimationFrame(run);
    return () => cancelAnimationFrame(frame);
  }, [active, reducedMotion, line]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey || SKIP_IGNORED_KEYS.has(event.key)) return;
      // Enter or Space on the focused App Store link opens it instead.
      if (event.target instanceof HTMLElement && event.target.closest('[data-boot-link]')) return;
      callbacks.current.onSkip();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const showLink = stage === 'card';
  return <div className="boot-seq" data-boot-stage={stage} onClick={() => callbacks.current.onSkip()}>
    <div className="boot-seq__lcd">
      <canvas ref={canvasRef} className="boot-seq__canvas" width={CANVAS.width} height={CANVAS.height} aria-hidden="true"/>
      {showLink && <a
        className="boot-seq__link"
        data-boot-link
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        style={{ left: pct(LINK_RECT.x, CANVAS.width), top: pct(LINK_RECT.y, CANVAS.height), width: pct(LINK_RECT.width, CANVAS.width), height: pct(LINK_RECT.height, CANVAS.height) }}
        onClick={(event) => event.stopPropagation()}
      ><span className="boot-seq__sr">{line}</span></a>}
    </div>
    <p className="boot-seq__sr" role="status">{stage === 'card' ? 'Platter. Save any recipe from Reels, TikTok & blogs. Press Enter to continue.' : stage === 'splash' ? 'AsmitOS v2.8 starting' : ''}</p>
  </div>;
}
