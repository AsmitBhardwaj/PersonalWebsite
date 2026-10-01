import { describe, expect, it } from 'vitest';
import { navigateGrid } from './gridNav';

// The original hard-coded behaviour for the five home apps (4 columns: 0-3 on row one, 4 alone on row two).
describe('navigateGrid with the five current apps', () => {
  const nav = (index: number | null, direction: string) => navigateGrid(index, direction, 5);
  it('starts at the first app', () => { expect(nav(null, 'right')).toBe(0); });
  it('moves right and clamps at row end', () => {
    expect([0, 1, 2, 3].map((i) => nav(i, 'right'))).toEqual([1, 2, 3, 3]);
    expect(nav(4, 'right')).toBe(4);
  });
  it('moves left and clamps at row start', () => {
    expect([0, 1, 2, 3].map((i) => nav(i, 'left'))).toEqual([0, 0, 1, 2]);
    expect(nav(4, 'left')).toBe(4);
  });
  it('moves down to the last item of the next row', () => {
    expect([0, 1, 2, 3].map((i) => nav(i, 'down'))).toEqual([4, 4, 4, 4]);
    expect(nav(4, 'down')).toBe(4);
  });
  it('moves up from the second row to the first column', () => {
    expect(nav(4, 'up')).toBe(0);
    expect([0, 1, 2, 3].map((i) => nav(i, 'up'))).toEqual([0, 1, 2, 3]);
  });
});

describe('navigateGrid with larger grids', () => {
  it('keeps the column when the next row is full', () => {
    expect(navigateGrid(1, 'down', 9)).toBe(5);
    expect(navigateGrid(6, 'up', 9)).toBe(2);
    expect(navigateGrid(5, 'down', 9)).toBe(8);
  });
  it('does not wrap across rows', () => {
    expect(navigateGrid(3, 'right', 9)).toBe(3);
    expect(navigateGrid(4, 'left', 9)).toBe(4);
  });
});
