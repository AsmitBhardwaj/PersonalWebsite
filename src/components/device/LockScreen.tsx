import { useEffect, useState } from 'react';
import { portfolio } from '../../content/portfolio';

const TICK_MS = 15_000;
const clock = () => new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
const day = () => new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });

/**
 * The dim screen of the shut device. The lid is turned half a turn when closed, so the content is turned back to read upright
 * there, and it keeps turning with the lid during a swivel (see `.lock-screen` in screen.css). It is swapped out for the home
 * screen inside the redraw dim at the end of an opening swivel.
 */
export function LockScreen({ on }: { on: boolean }) {
  const [now, setNow] = useState(() => ({ time: clock(), day: day() }));
  useEffect(() => {
    if (!on) return;
    const update = () => setNow({ time: clock(), day: day() });
    update();
    const id = window.setInterval(update, TICK_MS);
    return () => window.clearInterval(id);
  }, [on]);
  return <div className="lock-screen" data-on={on} aria-hidden="true">
    <time className="lock-screen__time">{now.time}</time>
    <span className="lock-screen__day">{now.day}</span>
    <b className="lock-screen__name">{portfolio.statusName}</b>
  </div>;
}
