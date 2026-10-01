import { describe, expect, it } from 'vitest';
import { SWIVEL, SWIVEL_SPEED } from './swivelConfig';
import {
  SWING_TRAVEL, angleAtDistance, distanceAtAngle, glareTransform, glassWorldRotation, poseAt, recoilDirection, shouldComplete,
  swivelEase, timeAtDistance,
} from './swivelMotion';

const SIZE = { w: 786, h: 510 };
const sampleSpeeds = (steps = 2000) => Array.from({ length: steps }, (_, i) => (swivelEase((i + 1) / steps) - swivelEase(i / steps)) * steps);

describe('swing velocity profile', () => {
  it('runs the base 430 ms swing slowed by SWIVEL_SPEED, with a 3 degree overshoot and a matching settle', () => {
    expect(SWIVEL.swing.durationMs).toBeCloseTo(430 * SWIVEL_SPEED, 6);
    expect(SWIVEL.swing.settleMs).toBeCloseTo(120 * SWIVEL_SPEED, 6);
    expect(SWIVEL.swing.overshootDeg).toBe(3);
    expect(SWING_TRAVEL).toBe(183);
  });

  it('scales every timed part by the same factor and leaves angles alone', () => {
    expect(SWIVEL.recoil.hitMs).toBeCloseTo(25 * SWIVEL_SPEED, 6);
    expect(SWIVEL.recoil.settleMs).toBeCloseTo(100 * SWIVEL_SPEED, 6);
    expect(SWIVEL.swing.springBackMs).toBeCloseTo(260 * SWIVEL_SPEED, 6);
    expect(SWIVEL.redraw.dimMs).toBeCloseTo(80 * SWIVEL_SPEED, 6);
    expect(SWIVEL.redraw.dimInMs).toBeCloseTo(25 * SWIVEL_SPEED, 6);
    expect(SWIVEL.redraw.fadeInMs).toBeCloseTo(260 * SWIVEL_SPEED, 6);
    expect(SWIVEL.swing.overshootDeg).toBe(3);
    expect(SWIVEL.drag.releaseThresholdDeg).toBe(30);
  });

  it('starts and ends at rest', () => {
    expect(swivelEase(0)).toBe(0);
    expect(swivelEase(1)).toBeCloseTo(1, 6);
  });

  it('spends a quarter or more of the swing on the first 15 degrees (the thumb push)', () => {
    expect(timeAtDistance(15)).toBeGreaterThan(0.25);
    expect(timeAtDistance(15) * SWIVEL.swing.durationMs).toBeGreaterThan(100 * SWIVEL_SPEED);
  });

  it('peaks in speed around 90 degrees and is faster there than at the start or the stop', () => {
    const speeds = sampleSpeeds();
    const peak = speeds.indexOf(Math.max(...speeds)) / speeds.length;
    const peakAngle = swivelEase(peak) * SWING_TRAVEL;
    expect(peakAngle).toBeGreaterThan(85);
    expect(peakAngle).toBeLessThan(97);
    expect(Math.max(...speeds)).toBeGreaterThan(speeds[0] * 10);
    expect(Math.max(...speeds)).toBeGreaterThan(speeds[speeds.length - 1] * 10);
  });

  it('is monotonic, so the swing never backs up before the settle', () => {
    const speeds = sampleSpeeds();
    expect(Math.min(...speeds)).toBeGreaterThanOrEqual(0);
  });

  it('lets a released drag join the curve where it is', () => {
    for (const distance of [5, 30, 90, 150]) {
      expect(swivelEase(timeAtDistance(distance)) * SWING_TRAVEL).toBeCloseTo(distance, 1);
    }
  });
});

describe('pose', () => {
  it('matches the original rest poses exactly', () => {
    const closed = poseAt(0);
    expect(closed).toMatchObject({ rotation: 0, yPercent: 64, scale: 1, lift: 0, backOpacity: 1, frontOpacity: 0, ghostOpacity: 0 });
    const open = poseAt(180);
    expect(open).toMatchObject({ rotation: 180, yPercent: -16, scale: 1, lift: 0, backOpacity: 0, frontOpacity: 1, ghostOpacity: 0 });
  });

  it('lifts to the configured scale mid-swing and is flat at rest, overshoot included', () => {
    expect(poseAt(90).scale).toBeCloseTo(SWIVEL.lift.peakScale, 6);
    expect(poseAt(183).scale).toBe(1);
    expect(poseAt(-3).scale).toBe(1);
  });

  it('grows, softens and offsets the shadow when lifted, and tightens it at rest', () => {
    const rest = poseAt(180);
    const lifted = poseAt(90);
    expect(lifted.shadowTight.scale).toBeGreaterThan(rest.shadowTight.scale);
    expect(lifted.shadowSoft.scale).toBeGreaterThan(rest.shadowSoft.scale);
    expect(lifted.shadowSoft.opacity).toBeGreaterThan(rest.shadowSoft.opacity);
    expect(lifted.shadowTight.opacity).toBeLessThan(rest.shadowTight.opacity);
    expect(lifted.shadowTight.y).toBeGreaterThan(rest.shadowTight.y);
    expect(lifted.shadowSoft.x).toBeGreaterThan(rest.shadowSoft.x);
    expect(poseAt(183).shadowTight).toEqual(rest.shadowTight);
  });

  it('keeps the lid opaque through the face swap', () => {
    for (let angle = 0; angle <= 183; angle += 1) {
      const { backOpacity, frontOpacity } = poseAt(angle);
      expect(Math.max(backOpacity, frontOpacity)).toBe(1);
    }
  });

  it('overshoots the open pose by the same slope the swing travels', () => {
    expect(poseAt(183).yPercent).toBeCloseTo(-16 - 80 * 3 / 180, 6);
  });
});

describe('direction and drag helpers', () => {
  it('measures distance from the rest pose a swivel leaves', () => {
    expect(distanceAtAngle(40, 1)).toBe(40);
    expect(distanceAtAngle(140, -1)).toBe(40);
    expect(angleAtDistance(40, 1)).toBe(40);
    expect(angleAtDistance(40, -1)).toBe(140);
  });

  it('completes at 30 degrees or more and springs back under it, in both directions', () => {
    expect(shouldComplete(29.9, 1)).toBe(false);
    expect(shouldComplete(30, 1)).toBe(true);
    expect(shouldComplete(150.1, -1)).toBe(false);
    expect(shouldComplete(150, -1)).toBe(true);
  });

  it('recoils opposite to where the screen mass is travelling', () => {
    expect(recoilDirection(1, 180)).toBe(1);
    expect(recoilDirection(-1, 0)).toBe(1);
    expect(Math.abs(SWIVEL.recoil.distancePx)).toBeGreaterThanOrEqual(1);
    expect(Math.abs(SWIVEL.recoil.distancePx)).toBeLessThanOrEqual(2);
  });
});

describe('glare', () => {
  it('stays within 10-15% white', () => {
    expect(SWIVEL.glare.peakAlpha).toBeGreaterThanOrEqual(0.1);
    expect(SWIVEL.glare.peakAlpha).toBeLessThanOrEqual(0.15);
  });

  it('counter-rotates exactly against the glass so the gradient is fixed in world space', () => {
    for (const angle of [0, 45, 90, 135, 180, 183]) {
      expect(glareTransform(angle, SIZE).rotation + glassWorldRotation(angle)).toBeCloseTo(0, 9);
    }
  });

  it('sits at its anchor at the open pose and sweeps across the glass on the way there', () => {
    const open = glareTransform(180, SIZE);
    expect(open.x).toBeCloseTo(SWIVEL.glare.worldOffset.x * SIZE.w, 6);
    expect(open.y).toBeCloseTo(SWIVEL.glare.worldOffset.y * SIZE.h, 6);
    const earlier = glareTransform(100, SIZE);
    expect(Math.hypot(earlier.x - open.x, earlier.y - open.y)).toBeGreaterThan(SIZE.h * 0.2);
  });
});
