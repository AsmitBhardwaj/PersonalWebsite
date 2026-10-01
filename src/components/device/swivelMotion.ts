import gsap from 'gsap';
import { CustomEase } from 'gsap/CustomEase';
import { SWIVEL } from './swivelConfig';

gsap.registerPlugin(CustomEase);

const { pose: POSE, swing: SWING, lift: LIFT, shadow: SHADOW, glare: GLARE, faceSwap: FACES, contactShadow: CONTACT } = SWIVEL;

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const lerp = (from: number, to: number, t: number) => from + (to - from) * t;
const smooth = (t: number) => { const x = clamp(t); return x * x * (3 - 2 * x); };
const toRad = (deg: number) => deg * Math.PI / 180;

const [x1, y1, x2, y2] = SWING.easeControls;
/** Velocity profile of the swing: 0..1 time in, 0..1 distance out. Distance 1 is the overshoot peak. */
export const swivelEase: (t: number) => number = CustomEase.create('sidekickSwivel', `M0,0 C${x1},${y1} ${x2},${y2} 1,1`);

/** Distance the swing travels from a rest pose to its overshoot peak. */
export const SWING_TRAVEL = Math.abs(POSE.openAngle - POSE.closedAngle) + SWIVEL.swing.overshootDeg;

/** The eased time at which the swing has covered `distance` degrees, so a released drag can join the curve where it is. */
export function timeAtDistance(distance: number): number {
  const target = clamp(distance / SWING_TRAVEL);
  let low = 0;
  let high = 1;
  for (let i = 0; i < 30; i++) {
    const mid = (low + high) / 2;
    if (swivelEase(mid) < target) low = mid; else high = mid;
  }
  return (low + high) / 2;
}

/** Screen angle for a distance travelled from the closed pose (opening, dir 1) or from the open pose (closing, dir -1). */
export function angleAtDistance(distance: number, dir: 1 | -1): number {
  return dir > 0 ? POSE.closedAngle + distance : POSE.openAngle - distance;
}

/** Distance travelled from the rest pose a swivel in direction `dir` leaves from. */
export function distanceAtAngle(angle: number, dir: 1 | -1): number {
  return dir > 0 ? angle - POSE.closedAngle : POSE.openAngle - angle;
}

/** Whether releasing a drag at `angle` completes the swivel in direction `dir` or springs back. */
export function shouldComplete(angle: number, dir: 1 | -1): boolean {
  return distanceAtAngle(angle, dir) >= SWIVEL.drag.releaseThresholdDeg;
}

export interface Layer { opacity: number; x: number; y: number; scale: number }

export interface Pose {
  rotation: number;
  yPercent: number;
  scale: number;
  /** 0 at rest, 1 at mid-swing. */
  lift: number;
  backOpacity: number;
  frontOpacity: number;
  ghostOpacity: number;
  contact: { y: number; scaleX: number; opacity: number };
  shadowTight: Layer;
  shadowSoft: Layer;
}

const shadowLayer = (spec: typeof SHADOW.tight | typeof SHADOW.soft, lift: number): Layer => ({
  opacity: lerp(spec.restOpacity, spec.liftedOpacity, lift),
  x: lerp(spec.restOffset.x, spec.liftedOffset.x, lift),
  y: lerp(spec.restOffset.y, spec.liftedOffset.y, lift),
  scale: lerp(spec.restScale, spec.liftedScale, lift),
});

/** Everything that depends only on the screen angle. */
export function poseAt(angle: number): Pose {
  const span = POSE.openAngle - POSE.closedAngle;
  const along = (angle - POSE.closedAngle) / span;
  const lift = along <= 0 || along >= 1 ? 0 : Math.sin(Math.PI * along); // exactly 0 at rest, not 1e-16
  return {
    rotation: angle,
    yPercent: lerp(POSE.closedYPercent, POSE.openYPercent, along),
    scale: lerp(1, LIFT.peakScale, lift),
    lift,
    backOpacity: angle >= FACES.backHiddenFromDeg ? 0 : 1,
    frontOpacity: smooth((angle - FACES.frontFadeDeg[0]) / (FACES.frontFadeDeg[1] - FACES.frontFadeDeg[0])),
    ghostOpacity: SWIVEL.ghostPeakOpacity * lift,
    contact: {
      y: lerp(CONTACT.closed.y, CONTACT.open.y, clamp(along)),
      scaleX: lerp(CONTACT.closed.scaleX, CONTACT.open.scaleX, clamp(along)),
      opacity: lerp(CONTACT.closed.opacity, CONTACT.open.opacity, clamp(along)),
    },
    shadowTight: shadowLayer(SHADOW.tight, lift),
    shadowSoft: shadowLayer(SHADOW.soft, lift),
  };
}

export interface Size { w: number; h: number }
export interface Point { x: number; y: number }

const rotate = (p: Point, deg: number): Point => {
  const c = Math.cos(toRad(deg));
  const s = Math.sin(toRad(deg));
  return { x: p.x * c - p.y * s, y: p.x * s + p.y * c };
};

/** Where the screen layer's centre sits, relative to its hinge, in px. The layer is hinged 8% below its centre. */
const centreFromHinge = (size: Size): Point => ({ x: 0, y: (0.5 - POSE.originY) * size.h });

/** World position of the screen centre relative to the hinge's layout position, in px. */
function glassCentre(angle: number, size: Size): Point {
  const along = (angle - POSE.closedAngle) / (POSE.openAngle - POSE.closedAngle);
  const shift = lerp(POSE.closedYPercent, POSE.openYPercent, along) / 100 * size.h;
  const turned = rotate(centreFromHinge(size), angle);
  return { x: turned.x, y: shift + turned.y };
}

/** The glass faces the viewer upright at the open pose, so its world rotation is the layer's turn minus a half turn. */
export const glassWorldRotation = (angle: number) => angle - POSE.openAngle;

/**
 * Transform for the glare layer that pins its gradient in world space: counter-rotate by the glass's turn and
 * counter-translate by where the glass has moved, both expressed in the glass's own frame. The band is anchored near
 * the glass centre at the open pose, so as the glass swings up it sweeps across.
 */
export function glareTransform(angle: number, size: Size): { x: number; y: number; rotation: number } {
  const anchorWorld = glassCentre(POSE.openAngle, size);
  anchorWorld.x += GLARE.worldOffset.x * size.w;
  anchorWorld.y += GLARE.worldOffset.y * size.h;
  const centre = glassCentre(angle, size);
  const local = rotate({ x: anchorWorld.x - centre.x, y: anchorWorld.y - centre.y }, -glassWorldRotation(angle));
  return { x: local.x, y: local.y, rotation: -glassWorldRotation(angle) };
}

/**
 * Which way the body kicks at the stop: opposite to where the screen mass (its centre, off the hinge) is travelling.
 * Returns -1, 0 or 1 for the x axis; the kick is horizontal.
 */
export function recoilDirection(dir: 1 | -1, restAngle: number): number {
  const tangential = dir * Math.cos(toRad(restAngle)); // x velocity of a point straight above the hinge, up to scale
  return Math.abs(tangential) < 1e-6 ? 0 : -Math.sign(tangential);
}

export const SWIVEL_REST = { closed: POSE.closedAngle, open: POSE.openAngle } as const;
