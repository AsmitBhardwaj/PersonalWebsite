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
    /** The clack fires on user-initiated swivels only (open or close), never on skip, the idle auto-open or reduced-motion restores. */
    onOpen: true,
    onClose: true,
    storageKey: 'sidekick:muted',
  },

  /**
   * Discoverability while the device sits closed and nobody touches it. Any pointer or key interaction restarts the idle
   * clock and cancels a nudge in progress. These are real waits, so they are not scaled by SWIVEL_SPEED.
   */
  idle: {
    /** Idle time before the first nudge. */
    nudgeAfterMs: 3000,
    /** Gap between nudges while still idle. */
    nudgeEveryMs: 6000,
    maxNudges: 3,
    /** How far the lid lifts in a nudge before springing back (silent, same spring as a released short drag). */
    nudgeDeg: 7,
    /** Time the lid takes to lift to the nudge peak. */
    nudgeLiftMs: slow(140),
    /** Safety net: still closed and untouched after this long, the lid opens itself, silently, into the normal boot/home flow. */
    autoOpenAfterMs: 12000,
  },

  /**
   * First visit only: the phone "rings" instead of nudging the lid. A buzz shakes the whole device sideways (transform only)
   * and wakes the lock screen, which then keeps a message notification up. Visual only, since sound needs a gesture first.
   * Real waits like `idle`, so not scaled by SWIVEL_SPEED. Returning visitors, and the first visit once the lid has been
   * opened, get the normal nudge.
   */
  ring: {
    firstBuzzMs: 1500,
    buzzEveryMs: 5000,
    maxBuzzes: 3,
    /** One buzz: `pulses` quick left-right shakes squeezed into `durationMs`, each `shakePx` wide. */
    pulses: 3,
    durationMs: 350,
    shakePx: 3,
    /** Lock screen brightness before the first buzz (idle) and after it, and how long the change takes. */
    idleBrightness: 0.55,
    awakeBrightness: 1,
    wakeMs: 180,
    /** The notification slides in over `slideSteps` hard pixel steps spanning `slideMs`. */
    slideMs: 240,
    slideSteps: 6,
    pillText: 'Tap to read the message',
    notification: { title: '1 new message', body: 'asmit: hey, you found my sidekick' },
  },

  /** Ghost of the lid left behind mid-swing (existing intro flourish). */
  ghostPeakOpacity: 0.18,
  /** Contact shadow under the screen at each rest pose (existing intro values). */
  contactShadow: {
    closed: { y: 0, scaleX: 0.94, opacity: 0.5 },
    open: { y: -4, scaleX: 1.04, opacity: 0.55 },
  },
} as const;
