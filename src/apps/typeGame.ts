import { portfolio } from '../content/portfolio';

// ---- Tuning ---------------------------------------------------------------
/** Fall speed at level 1, in play-field heights per second. */
export const START_SPEED = 0.085;
/** Added to the fall speed for each level after the first. */
export const SPEED_PER_LEVEL = 0.014;
/** Seconds between spawns at level 1. */
export const START_SPAWN_INTERVAL = 2.6;
/** Spawn interval shrinks by this much per level, down to MIN_SPAWN_INTERVAL. */
export const SPAWN_INTERVAL_STEP = 0.22;
export const MIN_SPAWN_INTERVAL = 0.85;
/** Words to finish before each level up. */
export const WORDS_PER_LEVEL = 10;
export const START_LIVES = 3;
export const POINTS_PER_LETTER = 10;
export const POP_SECONDS = 0.35;
export const LEVEL_BANNER_SECONDS = 1.4;
/** Largest simulated step, so a background-throttled frame cannot teleport words. */
export const MAX_FRAME_SECONDS = 0.1;
export const HIGH_SCORE_KEY = 'sidekick.type.highScore';
// ---------------------------------------------------------------------------

const TERMS = [
  'async', 'await', 'mutex', 'regex', 'lambda', 'closure', 'promise', 'thread', 'socket', 'kernel', 'cache', 'query',
  'schema', 'token', 'parser', 'compiler', 'binary', 'pointer', 'stack', 'queue', 'heap', 'hash', 'array', 'vector',
  'iterator', 'generator', 'callback', 'module', 'package', 'branch', 'commit', 'rebase', 'merge', 'deploy', 'docker',
  'cluster', 'proxy', 'router', 'cookie', 'session', 'bundle', 'lint', 'debug', 'recursion', 'semaphore', 'protocol',
  'sandbox', 'pipeline', 'runtime', 'monad', 'tuple', 'enum', 'class', 'object', 'string', 'integer', 'boolean',
];

/** Programming terms plus the words of each project title from the portfolio data. Lowercase letters only. */
export function buildWordPool(projectTitles: string[] = portfolio.projects.map((project) => project.title)): string[] {
  const words = [...TERMS, ...projectTitles.flatMap((title) => title.split(/[^A-Za-z]+/))].map((word) => word.toLowerCase());
  return [...new Set(words)].filter((word) => /^[a-z]+$/.test(word));
}

export interface FallingWord { id: number; text: string; /** 0..1 across the free width. */ x: number; /** 0 top .. 1 bottom. */ y: number; }
export interface Pop { id: number; text: string; x: number; y: number; age: number; }
export type GameStatus = 'start' | 'playing' | 'over';

export interface GameState {
  status: GameStatus;
  words: FallingWord[];
  /** The word the player is locked onto, or null. */
  targetId: number | null;
  typed: string;
  score: number;
  lives: number;
  /** Words finished this run. */
  cleared: number;
  spawnTimer: number;
  nextId: number;
  pops: Pop[];
  /** Seconds left to show the level-up banner. */
  levelBanner: number;
}

export const levelFor = (cleared: number) => 1 + Math.floor(cleared / WORDS_PER_LEVEL);
export const fallSpeedFor = (level: number) => START_SPEED + (level - 1) * SPEED_PER_LEVEL;
export const spawnIntervalFor = (level: number) => Math.max(MIN_SPAWN_INTERVAL, START_SPAWN_INTERVAL - (level - 1) * SPAWN_INTERVAL_STEP);

export function createGame(status: GameStatus = 'playing'): GameState {
  return {
    status, words: [], targetId: null, typed: '', score: 0, lives: START_LIVES, cleared: 0,
    // Start due, so the first word appears straight away.
    spawnTimer: START_SPAWN_INTERVAL, nextId: 1, pops: [], levelBanner: 0,
  };
}

/** The lowest on-screen word starting with this letter. */
export function pickTarget(words: FallingWord[], letter: string): FallingWord | undefined {
  return words.filter((word) => word.text.startsWith(letter)).reduce<FallingWord | undefined>((low, word) => (!low || word.y > low.y ? word : low), undefined);
}

/**
 * Apply one key. The first letter locks onto a word; the lock holds until the word is finished or
 * backspace empties the typed text. Wrong letters while locked are ignored.
 */
export function pressKey(state: GameState, rawKey: string): GameState {
  if (state.status !== 'playing') return state;
  if (rawKey === 'Backspace') {
    if (state.targetId === null) return state;
    const typed = state.typed.slice(0, -1);
    return { ...state, typed, targetId: typed ? state.targetId : null };
  }
  if (!/^[A-Za-z]$/.test(rawKey)) return state;
  const key = rawKey.toLowerCase();

  let target = state.words.find((word) => word.id === state.targetId);
  let typed = state.typed;
  if (!target) {
    target = pickTarget(state.words, key);
    if (!target) return state;
    typed = '';
  }
  if (target.text[typed.length] !== key) return state;
  typed += key;
  if (typed !== target.text) return { ...state, targetId: target.id, typed };

  const before = levelFor(state.cleared);
  const cleared = state.cleared + 1;
  return {
    ...state,
    words: state.words.filter((word) => word.id !== target.id),
    targetId: null,
    typed: '',
    score: state.score + target.text.length * POINTS_PER_LETTER,
    cleared,
    pops: [...state.pops, { id: target.id, text: target.text, x: target.x, y: target.y, age: 0 }],
    levelBanner: levelFor(cleared) > before ? LEVEL_BANNER_SECONDS : state.levelBanner,
  };
}

/** Advance the simulation by `dt` seconds: fall, lose lives for words that land, spawn, age effects. */
export function stepGame(state: GameState, dt: number, pool: string[], rng: () => number = Math.random): GameState {
  if (state.status !== 'playing') return state;
  const step = Math.min(dt, MAX_FRAME_SECONDS);
  const level = levelFor(state.cleared);
  const moved = state.words.map((word) => ({ ...word, y: word.y + fallSpeedFor(level) * step }));
  const landed = moved.filter((word) => word.y >= 1);
  let words = moved.filter((word) => word.y < 1);
  const lost = landed.some((word) => word.id === state.targetId);
  const lives = Math.max(0, state.lives - landed.length);

  let spawnTimer = state.spawnTimer + step;
  let nextId = state.nextId;
  if (spawnTimer >= spawnIntervalFor(level)) {
    spawnTimer = 0;
    words = [...words, spawnWord(pool, words, nextId++, rng)];
  }

  return {
    ...state,
    words,
    lives,
    status: lives === 0 ? 'over' : 'playing',
    targetId: lost ? null : state.targetId,
    typed: lost ? '' : state.typed,
    spawnTimer,
    nextId,
    pops: state.pops.map((pop) => ({ ...pop, age: pop.age + step })).filter((pop) => pop.age < POP_SECONDS),
    levelBanner: Math.max(0, state.levelBanner - step),
  };
}

function spawnWord(pool: string[], onScreen: FallingWord[], id: number, rng: () => number): FallingWord {
  const free = pool.filter((word) => !onScreen.some((on) => on.text === word));
  const choices = free.length ? free : pool;
  return { id, text: choices[Math.floor(rng() * choices.length)], x: rng(), y: 0 };
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
