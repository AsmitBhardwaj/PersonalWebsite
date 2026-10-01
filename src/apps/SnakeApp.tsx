import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { AppProps } from './types';
import { useAppInput } from '../input/useAppInput';
import { GRID_COLS, GRID_ROWS, KEY_DIRECTIONS, advance, cellSizeFor, createGame, queueTurn, readHighScore, swipeToDirection, writeHighScore } from './snakeGame';
import type { GameState } from './snakeGame';

/** `cell` is in device pixels, so the canvas is drawn on whole pixels and the checkerboard never shimmers. */
interface Grid { cell: number; dpr: number; }

const isTouch = () => { try { return window.matchMedia('(pointer: coarse)').matches; } catch { return false; } };

function draw(canvas: HTMLCanvasElement, grid: Grid, state: GameState) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const { cell, dpr } = grid;
  const width = GRID_COLS * cell, height = GRID_ROWS * cell;
  if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
  const line = Math.max(1, Math.round(dpr));
  for (let y = 0; y < GRID_ROWS; y++) for (let x = 0; x < GRID_COLS; x++) { ctx.fillStyle = (x + y) % 2 ? '#0e2733' : '#10303d'; ctx.fillRect(x * cell, y * cell, cell, cell); }

  const { food } = state;
  ctx.fillStyle = '#e96853';
  ctx.beginPath(); ctx.arc((food.x + 0.5) * cell, (food.y + 0.55) * cell, cell * 0.38, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.65)';
  ctx.fillRect(Math.round((food.x + 0.3) * cell), Math.round((food.y + 0.3) * cell), Math.max(1, Math.round(cell * 0.18)), Math.max(1, Math.round(cell * 0.18)));
  ctx.fillStyle = '#87a66e';
  ctx.fillRect(Math.round((food.x + 0.5) * cell), Math.round(food.y * cell + line), Math.max(1, Math.round(cell * 0.12)), Math.max(2, Math.round(cell * 0.22)));

  state.snake.forEach((part, i) => {
    const px = part.x * cell, py = part.y * cell;
    const gloss = ctx.createLinearGradient(0, py, 0, py + cell);
    gloss.addColorStop(0, i === 0 ? '#e6f7c9' : '#c4e49a'); gloss.addColorStop(0.5, i === 0 ? '#9fcf5f' : '#7fb24a'); gloss.addColorStop(0.51, i === 0 ? '#6e9f35' : '#5c8c30'); gloss.addColorStop(1, i === 0 ? '#8dc050' : '#74a63f');
    ctx.fillStyle = gloss;
    ctx.fillRect(px + line, py + line, cell - 2 * line, cell - 2 * line);
    ctx.strokeStyle = '#1d3612'; ctx.lineWidth = line;
    ctx.strokeRect(px + line * 1.5, py + line * 1.5, cell - 3 * line, cell - 3 * line);
  });
  const head = state.snake[0];
  ctx.fillStyle = '#10200a';
  const eye = Math.max(2, Math.round(cell * 0.16));
  ctx.fillRect(Math.round(head.x * cell + cell * 0.25), Math.round(head.y * cell + cell * 0.3), eye, eye);
  ctx.fillRect(Math.round(head.x * cell + cell * 0.6), Math.round(head.y * cell + cell * 0.3), eye, eye);
}

export function SnakeApp({ input, paused }: AppProps) {
  const fieldRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const game = useRef<GameState>(createGame('start'));
  const grid = useRef<Grid | null>(null);
  const [, render] = useReducer((n: number) => n + 1, 0);
  const [highScore, setHighScore] = useState(readHighScore);
  const [newHigh, setNewHigh] = useState(false);
  const best = useRef(highScore);
  const swipe = useRef<{ id: number; x: number; y: number; moved: boolean } | null>(null);
  const touch = useRef(isTouch());

  const redraw = useCallback(() => {
    if (canvasRef.current && grid.current) draw(canvasRef.current, grid.current, game.current);
  }, []);

  // The grid is fixed. Whenever the play field changes size (including entering or leaving focus mode) only the cell size is
  // recomputed and the board redrawn, so a run in progress carries straight on.
  useEffect(() => {
    const field = fieldRef.current;
    if (!field) return;
    const measure = () => {
      const { width, height } = field.getBoundingClientRect();
      if (width < 1 || height < 1) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      grid.current = { cell: cellSizeFor(width, height, dpr), dpr };
      if (canvasRef.current) { canvasRef.current.style.width = `${GRID_COLS * grid.current.cell / dpr}px`; canvasRef.current.style.height = `${GRID_ROWS * grid.current.cell / dpr}px`; }
      redraw();
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(field);
    return () => observer.disconnect();
  }, [redraw]);

  const start = useCallback(() => {
    if (game.current.status === 'playing') return;
    game.current = createGame();
    setNewHigh(false); redraw(); render();
  }, [redraw]);

  const turn = useCallback((dir: Parameters<typeof queueTurn>[1]) => {
    if (paused) return;
    game.current = queueTurn(game.current, dir);
  }, [paused]);

  useAppInput(input, (event) => {
    if (event.type !== 'keydown' || paused || event.repeat) return;
    if (event.key === 'Enter') { start(); return; }
    const dir = KEY_DIRECTIONS[event.key];
    if (dir) turn(dir);
  });

  const status = game.current.status;
  const playing = status === 'playing';
  useEffect(() => {
    if (paused || !playing) return;
    let frame = 0;
    let last = performance.now();
    let acc = 0;
    const tick = (now: number) => {
      const before = game.current;
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
  return <div className="type-game snake-game" data-status={state.status} data-score={state.score} data-length={state.snake.length}>
    <div className="type-hud">
      <span>Score <b>{state.score}</b></span>
      <span>Length <b>{state.snake.length}</b></span>
    </div>
    <div className="snake-wrap">
      <div ref={fieldRef} className="snake-field" data-dir={state.dir} data-head={`${state.snake[0].x},${state.snake[0].y}`} data-grid={`${GRID_COLS}x${GRID_ROWS}`}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={() => { swipe.current = null; }}>
        <canvas ref={canvasRef}/>
        {state.status === 'start' && <div className="type-overlay"><h2>Snake</h2><p>{verb} to start</p><small>High score {highScore}</small></div>}
        {state.status === 'over' && <div className="type-overlay"><h2>Game Over</h2><p>Score {state.score}</p>{newHigh && <strong className="type-newhigh">New high score!</strong>}<p>{touch.current ? 'Tap' : 'Enter'} to retry</p><small>High score {highScore}</small></div>}
      </div>
    </div>
  </div>;
}
