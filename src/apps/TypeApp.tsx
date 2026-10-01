import { useEffect, useReducer, useRef, useState } from 'react';
import { Heart } from 'lucide-react';
import type { AppProps } from './types';
import { useAppInput } from '../input/useAppInput';
import { buildWordPool, createGame, levelFor, pressKey, readHighScore, stepGame, writeHighScore } from './typeGame';
import type { GameState } from './typeGame';

const POOL = buildWordPool();
const MAX_LIVES_SHOWN = 3;

export function TypeApp({ input, paused }: AppProps) {
  const game = useRef<GameState>(createGame('start'));
  const [, render] = useReducer((n: number) => n + 1, 0);
  const [highScore, setHighScore] = useState(readHighScore);
  const [newHigh, setNewHigh] = useState(false);
  const best = useRef(highScore);

  useAppInput(input, (event) => {
    if (event.type !== 'keydown' || paused) return;
    const state = game.current;
    if (state.status !== 'playing') {
      if (event.key === 'Enter' && !event.repeat) { game.current = createGame(); setNewHigh(false); render(); }
      return;
    }
    if (event.repeat && event.key !== 'Backspace') return;
    game.current = pressKey(state, event.key);
    render();
  });

  const playing = game.current.status === 'playing';
  useEffect(() => {
    if (paused || !playing) return;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const next = stepGame(game.current, (now - last) / 1000, POOL);
      last = now;
      game.current = next;
      if (next.status === 'over') {
        if (next.score > best.current) { best.current = next.score; writeHighScore(next.score); setHighScore(next.score); setNewHigh(true); }
        render();
        return;
      }
      render();
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [paused, playing]);

  const state = game.current;
  const level = levelFor(state.cleared);
  return <div className="type-game" data-status={state.status}>
    <div className="type-hud">
      <span>Score <b>{state.score}</b></span>
      <span>Level <b>{level}</b></span>
      <span className="type-lives" aria-label={`${state.lives} lives`}>{Array.from({ length: MAX_LIVES_SHOWN }, (_, i) => <Heart key={i} className={i < state.lives ? 'on' : ''}/>)}</span>
    </div>
    <div className="type-field">
      {state.words.map((word) => {
        const locked = word.id === state.targetId;
        const done = locked ? state.typed.length : 0;
        return <span key={word.id} className={`type-word${locked ? ' is-locked' : ''}`} style={{ '--len': word.text.length, '--x': word.x, '--y': word.y } as React.CSSProperties}>
          <span><em>{word.text.slice(0, done)}</em>{word.text.slice(done)}</span>
        </span>;
      })}
      {state.pops.map((pop) => <span key={pop.id} className="type-word type-pop" aria-hidden="true" style={{ '--len': pop.text.length, '--x': pop.x, '--y': pop.y } as React.CSSProperties}><span>{pop.text}</span></span>)}
      {state.levelBanner > 0 && state.status === 'playing' && <div className="type-banner">Level {level}</div>}
      {state.status === 'start' && <div className="type-overlay"><h2>Type</h2><p>Press Enter to start</p><small>High score {highScore}</small></div>}
      {state.status === 'over' && <div className="type-overlay"><h2>Game Over</h2><p>Score {state.score}</p>{newHigh && <strong className="type-newhigh">New high score!</strong>}<p>Enter to retry</p><small>High score {highScore}</small></div>}
    </div>
  </div>;
}
