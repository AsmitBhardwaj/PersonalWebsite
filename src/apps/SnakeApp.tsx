import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { AppProps } from './types';
import { useAppInput } from '../input/useAppInput';
import { KEY_DIRECTIONS, advance, createGame, gridFor, queueTurn, readHighScore, swipeToDirection, writeHighScore } from './snakeGame';
import type { GameState } from './snakeGame';

interface Grid { cell: number; cols: number; rows: number; }

const isTouch = () => { try { return window.matchMedia('(pointer: coarse)').matches; } catch { return false; } };

function draw(canvas: HTMLCanvasElement, grid: Grid, state: GameState) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const { cell } = grid;
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const width = grid.cols * cell, height = grid.rows * cell;
  if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) { canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr); }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  for (let y = 0; y < grid.rows; y++) for (let x = 0; x < grid.cols; x++) { ctx.fillStyle = (x + y) % 2 ? '#0e2733' : '#10303d'; ctx.fillRect(x * cell, y * cell, cell, cell); }

  const { food } = state;
  ctx.fillStyle = '#e96853';
  ctx.beginPath(); ctx.arc((food.x + 0.5) * cell, (food.y + 0.55) * cell, cell * 0.38, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.65)';
  ctx.fillRect(Math.round((food.x + 0.3) * cell), Math.round((food.y + 0.3) * cell), Math.max(1, Math.round(cell * 0.18)), Math.max(1, Math.round(cell * 0.18)));
  ctx.fillStyle = '#87a66e';
  ctx.fillRect(Math.round((food.x + 0.5) * cell), Math.round(food.y * cell + 1), Math.max(1, Math.round(cell * 0.12)), Math.max(2, Math.round(cell * 0.22)));

  state.snake.forEach((part, i) => {
    const px = part.x * cell, py = part.y * cell;
    const gloss = ctx.createLinearGradient(0, py, 0, py + cell);
    gloss.addColorStop(0, i === 0 ? '#e6f7c9' : '#c4e49a'); gloss.addColorStop(0.5, i === 0 ? '#9fcf5f' : '#7fb24a'); gloss.addColorStop(0.51, i === 0 ? '#6e9f35' : '#5c8c30'); gloss.addColorStop(1, i === 0 ? '#8dc050' : '#74a63f');
    ctx.fillStyle = gloss;
    ctx.fillRect(px + 1, py + 1, cell - 2, cell - 2);
    ctx.strokeStyle = '#1d3612'; ctx.lineWidth = 1;
    ctx.strokeRect(px + 1.5, py + 1.5, cell - 3, cell - 3);
  });
  const head = state.snake[0];
  ctx.fillStyle = '#10200a';
  const eye = Math.max(2, Math.round(cell * 0.16));
  ctx.fillRect(Math.round(head.x * cell + cell * 0.25), Math.round(head.y * cell + cell * 0.3), eye, eye);
  ctx.fillRect(Math.round(head.x * cell + cell * 0.6), Math.round(head.y * cell + cell * 0.3), eye, eye);
}

export function SnakeApp({ input, paused, focused }: AppProps) {
  const fieldRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const game = useRef<GameState | null>(null);
  const grid = useRef<Grid | null>(null);
  const [, render] = useReducer((n: number) => n + 1, 0);
  const [highScore, setHighScore] = useState(readHighScore);
  const [newHigh, setNewHigh] = useState(false);
  const best = useRef(highScore);
  const swipe = useRef<{ id: number; x: number; y: number; moved: boolean } | null>(null);
  const touch = useRef(isTouch());

  const redraw = useCallback(() => {
    if (canvasRef.current && grid.current && game.current) draw(canvasRef.current, grid.current, game.current);
  }, []);

  // Size the grid in whole cells from the play field. Entering or leaving focus mode changes the field, which ends a run in progress.
  useEffect(() => {
    const field = fieldRef.current;
    if (!field) return;
    const measure = () => {
      const { width, height } = field.getBoundingClientRect();
      if (width < 1 || height < 1) return;
      const next = gridFor(width, height);
      const prev = grid.current;
      grid.current = next;
      if (!game.current || !prev || prev.cols !== next.cols || prev.rows !== next.rows) { game.current = createGame(next.cols, next.rows, 'start'); setNewHigh(false); render(); }
      redraw();
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(field);
    return () => observer.disconnect();
  }, [focused, redraw]);

  const start = useCallback(() => {
    if (!grid.current || game.current?.status === 'playing') return;
    game.current = createGame(grid.current.cols, grid.current.rows);
    setNewHigh(false); redraw(); render();
  }, [redraw]);

  const turn = useCallback((dir: Parameters<typeof queueTurn>[1]) => {
    if (paused || !game.current) return;
    game.current = queueTurn(game.current, dir);
  }, [paused]);

  useAppInput(input, (event) => {
    if (event.type !== 'keydown' || paused || event.repeat) return;
    if (event.key === 'Enter') { start(); return; }
    const dir = KEY_DIRECTIONS[event.key];
    if (dir) turn(dir);
  });

  const status = game.current?.status;
  const playing = status === 'playing';
  useEffect(() => {
    if (paused || !playing) return;
    let frame = 0;
    let last = performance.now();
    let acc = 0;
    const tick = (now: number) => {
      const before = game.current!;
      const result = advance(before, acc, (now - last) / 1000);
      last = now; acc = result.acc;
      game.current = result.state;
      if (result.state !== before) {
        redraw();
        if (result.state.status === 'over' && result.state.score > best.current) { best.current = result.state.score; writeHighScore(result.state.score); setHighScore(result.state.score); setNewHigh(true); }
        render();
      }
      if (result.state.status === 'playing') frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [paused, playing, redraw]);

  const onPointerDown = (event: ReactPointerEvent) => {
    swipe.current = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
    try { (event.currentTarget as Element).setPointerCapture(event.pointerId); } catch { /* synthetic or released pointer: swipes still work inside the field */ }
  };
  const onPointerMove = (event: ReactPointerEvent) => {
    const origin = swipe.current;
    if (!origin || origin.id !== event.pointerId) return;
    const dir = swipeToDirection(event.clientX - origin.x, event.clientY - origin.y);
    if (!dir) return;
    origin.moved = true; origin.x = event.clientX; origin.y = event.clientY;
    turn(dir);
  };
  const onPointerUp = (event: ReactPointerEvent) => {
    const origin = swipe.current;
    swipe.current = null;
    if (!origin || origin.id !== event.pointerId) return;
    const dir = swipeToDirection(event.clientX - origin.x, event.clientY - origin.y);
    if (dir) turn(dir);
    else if (!origin.moved && !paused) start();
  };

  const state = game.current;
  const verb = touch.current ? 'Tap' : 'Press Enter';
  const g = grid.current;
  return <div className="type-game snake-game" data-status={state?.status ?? 'start'}>
    <div className="type-hud">
      <span>Score <b>{state?.score ?? 0}</b></span>
      <span>Length <b>{state?.snake.length ?? 0}</b></span>
    </div>
    <div className="snake-wrap">
      <div ref={fieldRef} className="snake-field" data-dir={state?.dir} data-head={state ? `${state.snake[0].x},${state.snake[0].y}` : undefined} data-grid={g ? `${g.cols}x${g.rows}` : undefined}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={() => { swipe.current = null; }}>
        <canvas ref={canvasRef} style={g ? { width: g.cols * g.cell, height: g.rows * g.cell } : undefined}/>
        {state?.status === 'start' && <div className="type-overlay"><h2>Snake</h2><p>{verb} to start</p><small>High score {highScore}</small></div>}
        {state?.status === 'over' && <div className="type-overlay"><h2>Game Over</h2><p>Score {state.score}</p>{newHigh && <strong className="type-newhigh">New high score!</strong>}<p>{touch.current ? 'Tap' : 'Enter'} to retry</p><small>High score {highScore}</small></div>}
      </div>
    </div>
  </div>;
}
