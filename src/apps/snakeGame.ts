// ---- Tuning ---------------------------------------------------------------
/**
 * The board is a fixed logical grid. A resize or focus-mode change only rescales the cells to the play field and letterboxes the
 * leftover space; it never changes the grid, so it can never end or reset a run. 20x14 sits between the in-device field (about
 * 1.8:1) and a phone's focus-mode field (about 0.75:1 to 1.4:1).
 */
export const GRID_COLS = 20;
export const GRID_ROWS = 14;
export const START_LENGTH = 3;
/** Seconds per move at the start, shrinking by SPEED_STEP every FOOD_PER_SPEEDUP food down to MIN_TICK_SECONDS. */
export const START_TICK_SECONDS = 0.16;
export const SPEED_STEP = 0.01;
export const MIN_TICK_SECONDS = 0.07;
export const FOOD_PER_SPEEDUP = 5;
export const POINTS_PER_FOOD = 10;
/** Turns held between ticks; more are dropped. */
export const MAX_QUEUED_TURNS = 2;
/** Pointer travel in CSS px that counts as a swipe rather than a tap. */
export const SWIPE_THRESHOLD = 24;
/** Largest simulated frame, so a background-throttled frame cannot run the snake into a wall. */
export const MAX_FRAME_SECONDS = 0.25;
export const HIGH_SCORE_KEY = 'sidekick.snake.highScore';
// ---------------------------------------------------------------------------

export type Direction = 'up' | 'down' | 'left' | 'right';
export interface Point { x: number; y: number; }
export type GameStatus = 'start' | 'playing' | 'over';

export interface GameState {
  status: GameStatus;
  cols: number;
  rows: number;
  /** Head first. */
  snake: Point[];
  /** Direction of the last completed move. */
  dir: Direction;
  /** Turns waiting for the next ticks, oldest first. */
  queue: Direction[];
  food: Point;
  score: number;
  /** Food eaten this run. */
  eaten: number;
}

const DELTA: Record<Direction, Point> = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
const OPPOSITE: Record<Direction, Direction> = { up: 'down', down: 'up', left: 'right', right: 'left' };
export const KEY_DIRECTIONS: Record<string, Direction> = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };

const same = (a: Point, b: Point) => a.x === b.x && a.y === b.y;

/** Whole device pixels per cell so the fixed grid fits inside a play field of `width` x `height` CSS px, with any leftover space letterboxed. */
export function cellSizeFor(width: number, height: number, dpr = 1): number {
  return Math.max(1, Math.floor(Math.min(width / GRID_COLS, height / GRID_ROWS) * dpr));
}

export const tickSecondsFor = (eaten: number) => Math.max(MIN_TICK_SECONDS, START_TICK_SECONDS - Math.floor(eaten / FOOD_PER_SPEEDUP) * SPEED_STEP);

export function placeFood(cols: number, rows: number, snake: Point[], rng: () => number = Math.random): Point | null {
  const free: Point[] = [];
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) if (!snake.some((part) => part.x === x && part.y === y)) free.push({ x, y });
  return free.length ? free[Math.floor(rng() * free.length)] : null;
}

export function createGame(status: GameStatus = 'playing', rng: () => number = Math.random, cols = GRID_COLS, rows = GRID_ROWS): GameState {
  const y = Math.floor(rows / 2);
  const headX = Math.floor(cols / 2);
  const snake = Array.from({ length: START_LENGTH }, (_, i) => ({ x: headX - i, y }));
  return { status, cols, rows, snake, dir: 'right', queue: [], food: placeFood(cols, rows, snake, rng) ?? { x: 0, y: 0 }, score: 0, eaten: 0 };
}

/** Queue a turn. Repeats and direct reversals (judged against the last queued turn) are ignored, and at most MAX_QUEUED_TURNS wait. */
export function queueTurn(state: GameState, dir: Direction): GameState {
  if (state.status !== 'playing' || state.queue.length >= MAX_QUEUED_TURNS) return state;
  const last = state.queue[state.queue.length - 1] ?? state.dir;
  if (dir === last || dir === OPPOSITE[last]) return state;
  return { ...state, queue: [...state.queue, dir] };
}

/** Advance one cell: take the next queued turn, move, then die on a wall or the snake's own body, or eat and grow. */
export function stepSnake(state: GameState, rng: () => number = Math.random): GameState {
  if (state.status !== 'playing') return state;
  const [turn, ...queue] = state.queue;
  const dir = turn ?? state.dir;
  const head = { x: state.snake[0].x + DELTA[dir].x, y: state.snake[0].y + DELTA[dir].y };
  if (head.x < 0 || head.y < 0 || head.x >= state.cols || head.y >= state.rows) return { ...state, dir, queue, status: 'over' };

  const eats = same(head, state.food);
  // The tail cell is vacated this tick unless the snake is growing, so stepping onto it is safe.
  const body = eats ? state.snake : state.snake.slice(0, -1);
  if (body.some((part) => same(part, head))) return { ...state, dir, queue, status: 'over' };

  const snake = [head, ...body];
  if (!eats) return { ...state, snake, dir, queue };
  const food = placeFood(state.cols, state.rows, snake, rng);
  return { ...state, snake, dir, queue, food: food ?? state.food, score: state.score + POINTS_PER_FOOD, eaten: state.eaten + 1, status: food ? 'playing' : 'over' };
}

/** Fixed-timestep driver: run as many ticks as `acc + dt` covers and return the remainder. */
export function advance(state: GameState, acc: number, dt: number, rng: () => number = Math.random): { state: GameState; acc: number } {
  let next = state;
  let left = acc + Math.min(dt, MAX_FRAME_SECONDS);
  while (next.status === 'playing' && left >= tickSecondsFor(next.eaten)) {
    left -= tickSecondsFor(next.eaten);
    next = stepSnake(next, rng);
  }
  return { state: next, acc: left };
}

/** The dominant axis of a pointer movement, or null while it is still under the threshold. */
export function swipeToDirection(dx: number, dy: number, threshold: number = SWIPE_THRESHOLD): Direction | null {
  if (Math.max(Math.abs(dx), Math.abs(dy)) < threshold) return null;
  if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? 'right' : 'left';
  return dy > 0 ? 'down' : 'up';
}

export function readHighScore(): number {
  try {
    const value = Number(localStorage.getItem(HIGH_SCORE_KEY));
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
  } catch { return 0; }
}

export function writeHighScore(score: number) {
  try { localStorage.setItem(HIGH_SCORE_KEY, String(score)); } catch { /* storage unavailable: keep the score in memory only */ }
}
