import { describe, expect, it } from 'vitest';
import {
  FOOD_PER_SPEEDUP, MAX_QUEUED_TURNS, GRID_COLS, GRID_ROWS, MIN_TICK_SECONDS, POINTS_PER_FOOD, START_LENGTH, START_TICK_SECONDS, SWIPE_THRESHOLD,
  advance, cellSizeFor, createGame, placeFood, queueTurn, stepSnake, swipeToDirection, tickSecondsFor,
} from './snakeGame';
import type { GameState, Point } from './snakeGame';

const rng = () => 0;
const gameWith = (extra: Partial<GameState> = {}): GameState => ({ ...createGame('playing', rng, 10, 10), food: { x: 0, y: 0 }, ...extra });
const row = (y: number, ...xs: number[]): Point[] => xs.map((x) => ({ x, y }));

describe('movement', () => {
  it('starts as a short snake heading right, and moves one cell per step keeping its length', () => {
    const state = gameWith();
    expect(state.snake).toHaveLength(START_LENGTH);
    const next = stepSnake(state, rng);
    expect(next.snake[0]).toEqual({ x: state.snake[0].x + 1, y: state.snake[0].y });
    expect(next.snake).toHaveLength(START_LENGTH);
    expect(next.snake[next.snake.length - 1]).toEqual(state.snake[state.snake.length - 2]);
  });
  it('applies a queued turn on the next step', () => {
    const state = queueTurn(gameWith(), 'down');
    const next = stepSnake(state, rng);
    expect(next.dir).toBe('down');
    expect(next.snake[0]).toEqual({ x: state.snake[0].x, y: state.snake[0].y + 1 });
  });
});

describe('reverse block and turn buffer', () => {
  it('ignores a direct reversal and a repeat of the current direction', () => {
    const state = gameWith();
    expect(queueTurn(state, 'left')).toBe(state);
    expect(queueTurn(state, 'right')).toBe(state);
  });
  it('judges reversals against the last queued turn, so up then left then down is fine but up then down is not', () => {
    let state = queueTurn(gameWith(), 'up');
    expect(queueTurn(state, 'down')).toBe(state);
    state = queueTurn(state, 'left');
    expect(state.queue).toEqual(['up', 'left']);
  });
  it('holds at most two turns per tick and drops the rest', () => {
    let state = gameWith();
    for (const dir of ['up', 'left', 'down'] as const) state = queueTurn(state, dir);
    expect(state.queue).toHaveLength(MAX_QUEUED_TURNS);
    expect(state.queue).toEqual(['up', 'left']);
  });
  it('consumes one queued turn per step, in order', () => {
    let state = queueTurn(queueTurn(gameWith(), 'up'), 'left');
    state = stepSnake(state, rng);
    expect([state.dir, state.queue]).toEqual(['up', ['left']]);
    state = stepSnake(state, rng);
    expect([state.dir, state.queue]).toEqual(['left', []]);
  });
  it('takes no turns before the game is playing', () => {
    const state = createGame('start', rng, 10, 10);
    expect(queueTurn(state, 'up')).toBe(state);
  });
});

describe('growth and scoring', () => {
  it('eating grows by one, scores, and moves the food off the snake', () => {
    const state = gameWith({ food: { x: 6, y: 5 }, snake: row(5, 5, 4, 3) });
    const next = stepSnake(state, rng);
    expect(next.snake).toHaveLength(4);
    expect(next.score).toBe(POINTS_PER_FOOD);
    expect(next.eaten).toBe(1);
    expect(next.snake.some((part) => part.x === next.food.x && part.y === next.food.y)).toBe(false);
  });
  it('speeds up every FOOD_PER_SPEEDUP food, down to a cap', () => {
    expect(tickSecondsFor(0)).toBe(START_TICK_SECONDS);
    expect(tickSecondsFor(FOOD_PER_SPEEDUP - 1)).toBe(START_TICK_SECONDS);
    expect(tickSecondsFor(FOOD_PER_SPEEDUP)).toBeLessThan(START_TICK_SECONDS);
    expect(tickSecondsFor(10_000)).toBe(MIN_TICK_SECONDS);
  });
  it('places food only on free cells, and returns null when the board is full', () => {
    const snake = [...row(0, 0, 1), ...row(1, 0)];
    expect(placeFood(2, 2, snake, rng)).toEqual({ x: 1, y: 1 });
    expect(placeFood(2, 2, [...snake, { x: 1, y: 1 }], rng)).toBeNull();
  });
});

describe('collision', () => {
  it('dies on every wall without wrapping', () => {
    expect(stepSnake(gameWith({ snake: row(5, 9, 8, 7) }), rng).status).toBe('over');
    expect(stepSnake(gameWith({ snake: row(5, 0, 1, 2), dir: 'left' }), rng).status).toBe('over');
    expect(stepSnake(gameWith({ snake: [{ x: 5, y: 0 }, { x: 5, y: 1 }, { x: 5, y: 2 }], dir: 'up' }), rng).status).toBe('over');
    expect(stepSnake(gameWith({ snake: [{ x: 5, y: 9 }, { x: 5, y: 8 }, { x: 5, y: 7 }], dir: 'down' }), rng).status).toBe('over');
  });
  it('dies running into its own body', () => {
    const snake = [{ x: 5, y: 5 }, { x: 5, y: 6 }, { x: 4, y: 6 }, { x: 4, y: 5 }, { x: 4, y: 4 }];
    const state = { ...gameWith({ snake, dir: 'down' }), queue: ['left' as const] };
    expect(stepSnake(state, rng).status).toBe('over');
  });
  it('may step onto the tail cell it is vacating, but not when it just ate', () => {
    const loop = [{ x: 5, y: 5 }, { x: 5, y: 6 }, { x: 4, y: 6 }, { x: 4, y: 5 }];
    expect(stepSnake({ ...gameWith({ snake: loop, dir: 'up' }), queue: ['left'] }, rng).status).toBe('playing');
    expect(stepSnake({ ...gameWith({ snake: loop, dir: 'up', food: { x: 4, y: 5 } }), queue: ['left'] }, rng).status).toBe('over');
  });
  it('does nothing once the game is over', () => {
    const over = gameWith({ status: 'over' });
    expect(stepSnake(over, rng)).toBe(over);
  });
});

describe('fixed timestep', () => {
  it('runs whole ticks and carries the remainder', () => {
    const { state, acc } = advance(gameWith(), 0.2, 0.2); // 0.4s: two ticks and a remainder
    expect(state.snake[0].x).toBe(gameWith().snake[0].x + 2);
    expect(acc).toBeCloseTo(0.4 - START_TICK_SECONDS * 2);
  });
  it('clamps a huge frame so a throttled tab cannot run the snake into a wall', () => {
    expect(advance(gameWith(), 0, 60).state.status).toBe('playing');
  });
});

describe('fixed grid and rescaling', () => {
  it('always plays on the same 20x14 grid, whatever size the field is', () => {
    const state = createGame('start', rng);
    expect([state.cols, state.rows]).toEqual([GRID_COLS, GRID_ROWS]);
    expect([GRID_COLS, GRID_ROWS]).toEqual([20, 14]);
  });
  it('picks whole device pixels per cell that never overflow the field, letterboxing the rest', () => {
    for (const [w, h, dpr] of [[349, 194, 1], [374, 503, 3], [286, 159, 2], [100, 60, 1], [752, 541, 1.5]]) {
      const cell = cellSizeFor(w, h, dpr);
      expect(Number.isInteger(cell)).toBe(true);
      expect(GRID_COLS * cell).toBeLessThanOrEqual(w * dpr);
      expect(GRID_ROWS * cell).toBeLessThanOrEqual(h * dpr);
    }
    // The tighter axis decides: a wide field is limited by height, a tall one by width.
    expect(cellSizeFor(2000, 140)).toBe(10);
    expect(cellSizeFor(200, 2000)).toBe(10);
  });
  it('rescales without touching a run in progress', () => {
    const run = stepSnake(stepSnake(createGame('playing', rng), rng), rng);
    const before = JSON.stringify(run);
    cellSizeFor(300, 200); cellSizeFor(390, 600, 3);
    expect(JSON.stringify(run)).toBe(before);
    expect(run.status).toBe('playing');
  });
  it('gives a bigger field bigger cells', () => {
    expect(cellSizeFor(390, 520)).toBeGreaterThan(cellSizeFor(300, 200));
  });
});

describe('swipe to direction', () => {
  it('picks the dominant axis', () => {
    expect(swipeToDirection(60, 10)).toBe('right');
    expect(swipeToDirection(-60, 10)).toBe('left');
    expect(swipeToDirection(10, 60)).toBe('down');
    expect(swipeToDirection(10, -60)).toBe('up');
  });
  it('treats a short movement as a tap, and a threshold-length one as a swipe', () => {
    expect(swipeToDirection(SWIPE_THRESHOLD - 1, 0)).toBeNull();
    expect(swipeToDirection(0, 0)).toBeNull();
    expect(swipeToDirection(SWIPE_THRESHOLD, 0)).toBe('right');
  });
  it('breaks a diagonal tie toward the horizontal axis', () => {
    expect(swipeToDirection(40, 40)).toBe('right');
  });
});
