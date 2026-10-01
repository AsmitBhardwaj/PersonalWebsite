import { describe, expect, it } from 'vitest';
import {
  MIN_SPAWN_INTERVAL, START_LIVES, WORDS_PER_LEVEL, buildWordPool, createGame, fallSpeedFor, levelFor, pickTarget, pressKey, spawnIntervalFor, stepGame,
} from './typeGame';
import type { FallingWord, GameState } from './typeGame';

const word = (id: number, text: string, y: number): FallingWord => ({ id, text, x: 0.5, y });
const gameWith = (words: FallingWord[], extra: Partial<GameState> = {}): GameState => ({ ...createGame(), words, spawnTimer: 0, ...extra });
const type = (state: GameState, text: string) => [...text].reduce(pressKey, state);

describe('target lock', () => {
  it('locks onto the lowest word that starts with the letter', () => {
    expect(pickTarget([word(1, 'stack', 0.2), word(2, 'socket', 0.7), word(3, 'regex', 0.9)], 's')?.id).toBe(2);
  });
  it('stays locked on that word even when a lower word with the same letter exists', () => {
    let state = gameWith([word(1, 'stack', 0.2), word(2, 'socket', 0.7)]);
    state = type(state, 'so');
    expect(state.targetId).toBe(2);
    state = { ...state, words: [...state.words, word(3, 'schema', 0.95)] };
    state = pressKey(state, 'c');
    expect(state.targetId).toBe(2);
    expect(state.typed).toBe('soc');
  });
  it('ignores wrong letters while locked and letters nothing starts with', () => {
    let state = type(gameWith([word(1, 'stack', 0.2)]), 'st');
    expect(pressKey(state, 'x')).toBe(state);
    state = pressKey(gameWith([word(1, 'stack', 0.2)]), 'q');
    expect(state.targetId).toBeNull();
  });
  it('releases the lock when backspace empties the typed text, then retargets', () => {
    let state = type(gameWith([word(1, 'stack', 0.2), word(2, 'socket', 0.7)]), 'so');
    state = pressKey(state, 'Backspace');
    expect(state.targetId).toBe(2);
    state = pressKey(state, 'Backspace');
    expect(state.targetId).toBeNull();
    expect(state.typed).toBe('');
    expect(pressKey(state, 's').targetId).toBe(2);
  });
  it('finishing a word removes it, scores by length and unlocks', () => {
    const state = type(gameWith([word(1, 'mutex', 0.3), word(2, 'ab', 0.1)]), 'mutex');
    expect(state.words.map((w) => w.id)).toEqual([2]);
    expect(state.targetId).toBeNull();
    expect(state.score).toBe(50);
    expect(state.cleared).toBe(1);
    expect(state.pops).toHaveLength(1);
    expect(type(gameWith([word(1, 'ab', 0.1)]), 'ab').score).toBeLessThan(state.score);
  });
  it('is case-insensitive and ignores non-letters', () => {
    const state = gameWith([word(1, 'abc', 0.1)]);
    expect(pressKey(state, '1')).toBe(state);
    expect(type(state, 'AB').typed).toBe('ab');
  });
  it('releases the lock when the locked word lands', () => {
    const state = stepGame(type(gameWith([word(1, 'abc', 0.999)]), 'a'), 0.1, ['zzz']);
    expect(state.targetId).toBeNull();
    expect(state.typed).toBe('');
  });
});

describe('level progression', () => {
  it('levels up every WORDS_PER_LEVEL words', () => {
    expect(levelFor(0)).toBe(1);
    expect(levelFor(WORDS_PER_LEVEL - 1)).toBe(1);
    expect(levelFor(WORDS_PER_LEVEL)).toBe(2);
    expect(levelFor(WORDS_PER_LEVEL * 3)).toBe(4);
  });
  it('speeds the fall and shortens the spawn interval, with a floor', () => {
    expect(fallSpeedFor(2)).toBeGreaterThan(fallSpeedFor(1));
    expect(spawnIntervalFor(2)).toBeLessThan(spawnIntervalFor(1));
    expect(spawnIntervalFor(99)).toBe(MIN_SPAWN_INTERVAL);
  });
  it('the tenth finished word triggers level 2 and the banner', () => {
    const state = type(gameWith([word(1, 'ab', 0.1)], { cleared: WORDS_PER_LEVEL - 1 }), 'ab');
    expect(levelFor(state.cleared)).toBe(2);
    expect(state.levelBanner).toBeGreaterThan(0);
  });
  it('words fall faster at a higher level', () => {
    const at = (cleared: number) => stepGame(gameWith([word(1, 'abc', 0)], { cleared }), 0.1, ['zzz']).words[0].y;
    expect(at(WORDS_PER_LEVEL)).toBeGreaterThan(at(0));
  });
});

describe('lives and spawning', () => {
  it('a landed word costs a life and three end the game', () => {
    let state = stepGame(gameWith([word(1, 'abc', 0.999)]), 0.1, ['zzz']);
    expect(state.lives).toBe(START_LIVES - 1);
    expect(state.status).toBe('playing');
    state = stepGame({ ...state, words: [word(2, 'a', 0.999), word(3, 'b', 0.999)] }, 0.1, ['zzz']);
    expect(state.lives).toBe(0);
    expect(state.status).toBe('over');
  });
  it('spawns inside the screen width without duplicating on-screen words', () => {
    const state = stepGame(createGame(), 0.05, ['aa', 'bb'], () => 0.99);
    expect(state.words).toHaveLength(1);
    expect(state.words[0].x).toBeGreaterThanOrEqual(0);
    expect(state.words[0].x).toBeLessThanOrEqual(1);
    const next = stepGame({ ...state, spawnTimer: 99 }, 0.05, ['aa', 'bb'], () => 0);
    expect(new Set(next.words.map((w) => w.text)).size).toBe(2);
  });
});

describe('word pool', () => {
  it('is lowercase letters only and joins project names into one word', () => {
    const pool = buildWordPool(['Open Lane', 'Next.js 2']);
    expect(pool.every((w) => /^[a-z]+$/.test(w))).toBe(true);
    expect(pool).toEqual(expect.arrayContaining(['openlane', 'nextjs', 'mutex']));
    expect(pool).not.toContain('open');
  });
  it('works with a single project and with the portfolio data', () => {
    expect(buildWordPool(['Platter'])).toContain('platter');
    expect(buildWordPool()).toContain('platter');
    expect(buildWordPool([])).toContain('mutex');
  });
});
