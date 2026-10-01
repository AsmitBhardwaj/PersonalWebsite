import { useEffect, useRef, useState } from 'react';
import '@fontsource/silkscreen/400.css';
import { CANVAS } from '../../boot/bootConfig';
import { FONT_FAMILY } from '../../boot/bootRender';
import { createLockRenderer, lockFace } from '../../boot/lockRender';

const TICK_MS = 1000;

/**
 * The dim screen of the shut device, drawn like the boot screens: a 240x160 pixel canvas scaled with nearest-neighbour.
 * The lid is turned half a turn when closed, so the content is turned back to read upright there, and it keeps turning
 * with the lid during a swivel (see `.lock-screen` in screen.css). It is swapped out for the home screen inside the
 * redraw dim at the end of an opening swivel.
 */
export function LockScreen({ on }: { on: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [face, setFace] = useState(() => lockFace());

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
    const renderer = createLockRenderer(canvas);
    renderer?.draw(face);
    // Redraw once the pixel font arrives, so the first frame is never in a fallback face.
    let live = true;
    void document.fonts?.load(`8px ${FONT_FAMILY}`).then(() => document.fonts.load(`16px ${FONT_FAMILY}`)).then(() => { if (live) renderer?.draw(face); });
    return () => { live = false; };
  }, [face]);

  return <div className="lock-screen" data-on={on} aria-hidden="true">
    <div className="lock-screen__lcd">
      <canvas ref={canvasRef} className="lock-screen__canvas" width={CANVAS.width} height={CANVAS.height}/>
    </div>
    <span className="lock-screen__sr">{face.time} {face.date}</span>
  </div>;
}
