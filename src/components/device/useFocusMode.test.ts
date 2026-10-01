import { describe, expect, it } from 'vitest';
import { FOCUS_MAX_SCREEN_HEIGHT, openModeFor, viewportBox, wantsFocus, zoomFor } from './useFocusMode';

describe('focus mode sizing', () => {
  it('turns on only when the rendered screen is shorter than the threshold', () => {
    expect(wantsFocus(FOCUS_MAX_SCREEN_HEIGHT - 1)).toBe(true);
    expect(wantsFocus(FOCUS_MAX_SCREEN_HEIGHT)).toBe(false);
    expect(wantsFocus(269)).toBe(false); // desktop device at its 1120px width cap
    expect(wantsFocus(88)).toBe(true); // 390px phone
  });

  it('maps the viewport into the shell\'s own coordinates at scale 1', () => {
    const local = { left: 100, top: 50, width: 114, height: 88 };
    expect(viewportBox(local, { left: 120, top: 80, width: 114 }, { width: 390, height: 844 }))
      .toEqual({ left: -20, top: -30, width: 390, height: 844 });
  });

  it('accounts for a scaled ancestor', () => {
    const local = { left: 10, top: 10, width: 100, height: 80 };
    // Shell drawn at half size, 40px from the viewport edges.
    const box = viewportBox(local, { left: 40, top: 40, width: 50 }, { width: 200, height: 400 });
    expect(box).toEqual({ left: -70, top: -70, width: 400, height: 800 });
  });

  it('picks the open mode from presentation and screen size', () => {
    expect(openModeFor('read', 88)).toBe('focus');
    expect(openModeFor('play', 88)).toBe('focus');
    expect(openModeFor('read', 269)).toBe('zoom');
    expect(openModeFor('play', 269)).toBe('none');
  });

  it('zooms the screen to ~78% of the viewport height, capped by width', () => {
    expect(zoomFor({ width: 349, height: 269 }, { width: 1440, height: 900 })).toBeCloseTo(2.61, 1);
    expect(zoomFor({ width: 294, height: 226 }, { width: 1280, height: 720 })).toBeCloseTo(2.48, 1);
    expect(zoomFor({ width: 600, height: 200 }, { width: 800, height: 900 })).toBeCloseTo(1.23, 1); // width-limited
    expect(zoomFor({ width: 600, height: 700 }, { width: 800, height: 600 })).toBe(1); // never zooms out
  });
});
