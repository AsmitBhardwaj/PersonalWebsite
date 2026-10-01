import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

afterEach(cleanup);

Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
window.matchMedia = vi.fn().mockImplementation((query: string) => ({
  matches: false, media: query, onchange: null,
  addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
}));
// jsdom has no canvas: the pixel screens (boot, lock) draw nothing here, and this keeps it from logging "not implemented" for each one.
HTMLCanvasElement.prototype.getContext = vi.fn(() => null) as unknown as HTMLCanvasElement['getContext'];
