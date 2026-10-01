/**
 * Playback speed of the whole swivel as a divisor of time: 1.5 plays the same motion 1.5x slower. It scales every duration
 * below that is written with `slow()` (swing, settle, spring-back, recoil, redraw dim). Shadow, lift and glare are driven by
 * the screen angle, so they stretch with the swing automatically. Curves and angles are untouched.
 */
export const SWIVEL_SPEED = 1.5;
const slow = (baseMs: number) => baseMs * SWIVEL_SPEED;

/**
 * Every tuning value for the screen swivel lives here. Angles are degrees, durations are milliseconds,
 * lengths are CSS px or a percentage of the screen layer, as named.
 *
 * Rotation is clockwise (CSS positive) about the screen layer's hinge (`transform-origin`, see device.css).
 * `closed` and `open` are the original intro poses and must not drift: the open pose is what hardware hit-boxes
 * and the focus/zoom modes are measured against.
 */
export const SWIVEL = {
  pose: {
    closedAngle: 0,
    openAngle: 180,
    /** Screen layer `translateY` as a percentage of its own height at each rest pose. Interpolated linearly by angle. */
    closedYPercent: 64,
    openYPercent: -16,
    /** Hinge position inside the screen layer, matching `transform-origin` in device.css. */
    originY: 0.580392,
  },

  swing: {
    /** Time to reach the overshoot peak (430 ms at speed 1). The settle below is on top of this. */
    durationMs: slow(430),
    /** Degrees past the rest pose the swing travels before settling back. */
    overshootDeg: 3,
    settleMs: slow(120),
    /**
     * Cubic bezier controls (x1, y1, x2, y2) for the velocity profile, fed to GSAP CustomEase. Over the full travel this
     * gives a slow thumb push (~125 ms for the first 15 deg), a hard pull through the middle with peak speed at ~92 deg,
     * then a brake into the stop. Checked by swivelMotion.test.ts.
     */
    easeControls: [0.75, 0, 0.25, 1] as const,
    /** Spring back to rest after a drag released short of the threshold. */
    springBackMs: slow(260),
    springBackOvershoot: 1.6,
  },

  drag: {
    /** Travel from the rest pose after which a release completes the swivel. Below it the lid springs back. */
    releaseThresholdDeg: 30,
    /** Pointer travel under this counts as a tap, which opens the lid with the full animation. */
    tapSlopPx: 6,
  },

  recoil: {
    /** The device body kicks opposite to the swing at the stop. */
    distancePx: 1.5,
    hitMs: slow(25),
    settleMs: slow(100),
  },

  lift: {
    /** Peak screen-layer scale at mid-swing. Back to 1 at rest. */
    peakScale: 1.015,
  },

  /**
   * Shadow the lifted screen throws onto the body. Two layers cross-fade so the shadow reads as softer when lifted using
   * only transform and opacity. `rest` is the tight contact shadow, `lifted` the mid-swing one (offsets in % of the
   * screen layer).
   */
  shadow: {
    tight: {
      restOpacity: 0.5,
      liftedOpacity: 0.16,
      restOffset: { x: 0, y: 1.8 },
      liftedOffset: { x: 3, y: 13 },
      restScale: 1,
      liftedScale: 1.1,
    },
    soft: {
      restOpacity: 0,
      liftedOpacity: 0.5,
      restOffset: { x: 0, y: 2 },
      liftedOffset: { x: 4, y: 18 },
      restScale: 1,
      liftedScale: 1.28,
    },
  },

  /** Specular band that stays fixed in world space while the glass turns beneath it. */
  glare: {
    /** Peak white (0..1). Keep within roughly 0.10..0.15. Mirrored in `--glare-alpha` in device.css. */
    peakAlpha: 0.13,
    /** Where the band sits at the open rest pose, relative to the glass centre, as fractions of the screen layer's width/height. */
    worldOffset: { x: -0.08, y: -0.02 },
  },

  /** The display re-orienting after the swivel, like an OS rotating its UI. The lock-to-home swap happens inside the dim. */
  redraw: {
    dimLevel: 0.04,
    dimInMs: slow(25),
    /** Total time held near-black, including `dimInMs`. */
    dimMs: slow(80),
    fadeInMs: slow(260),
  },

  /** Short crossfade used instead of motion when the visitor prefers reduced motion. Not scaled: it replaces the swivel rather than being part of it. */
  reducedFadeMs: 150,

  sound: {
    url: '/assets/audio/clack.wav',
    volume: 0.6,
    /** The clack fires on user-initiated swivels only, never on skip, autoplay or reduced-motion restores. */
    onOpen: true,
    onClose: false,
    storageKey: 'sidekick:muted',
  },

  /** Ghost of the lid left behind mid-swing (existing intro flourish). */
  ghostPeakOpacity: 0.18,
  /** Contact shadow under the screen at each rest pose (existing intro values). */
  contactShadow: {
    closed: { y: 0, scaleX: 0.94, opacity: 0.5 },
    open: { y: -4, scaleX: 1.04, opacity: 0.55 },
  },
} as const;
