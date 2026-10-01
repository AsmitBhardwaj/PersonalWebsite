export interface IdleConfig {
  nudgeAfterMs: number;
  nudgeEveryMs: number;
  maxNudges: number;
  autoOpenAfterMs: number;
}

export interface IdleHooks {
  /** The device can act now: closed, at rest and visible. Checked when a timer fires, not when it is set. */
  active: () => boolean;
  nudge: () => void;
  autoOpen: () => void;
  /** Evaluated at each (re)start: false for reduced motion. */
  nudgesEnabled: () => boolean;
  /** Evaluated at each (re)start: the auto-open safety net only runs until the visitor has opened the device themselves. */
  autoOpenEnabled: () => boolean;
}

export interface IdleScheduler {
  /** Starts the idle clock from zero (the device has just come to rest closed, or the visitor just interacted). */
  start: () => void;
  stop: () => void;
}

/**
 * The idle clock for the closed device: a nudge after `nudgeAfterMs`, repeated every `nudgeEveryMs` up to `maxNudges`, and an
 * auto-open at `autoOpenAfterMs`. Pure timers (no DOM), so tests drive it with mocked time. `start` always begins from zero,
 * which is how an interaction cancels and resets everything.
 */
export function createIdleScheduler(config: IdleConfig, hooks: IdleHooks): IdleScheduler {
  let nudgeTimer: ReturnType<typeof setTimeout> | undefined;
  let openTimer: ReturnType<typeof setTimeout> | undefined;
  let nudges = 0;

  const stop = () => {
    clearTimeout(nudgeTimer); clearTimeout(openTimer);
    nudgeTimer = openTimer = undefined;
  };

  function scheduleNudge(delay: number) {
    nudgeTimer = setTimeout(() => {
      nudgeTimer = undefined;
      if (hooks.active()) { nudges += 1; hooks.nudge(); }
      if (nudges < config.maxNudges) scheduleNudge(config.nudgeEveryMs);
    }, delay);
  }

  return {
    start() {
      stop();
      nudges = 0;
      if (hooks.nudgesEnabled() && config.maxNudges > 0) scheduleNudge(config.nudgeAfterMs);
      if (hooks.autoOpenEnabled()) {
        openTimer = setTimeout(() => { openTimer = undefined; if (hooks.active()) { stop(); hooks.autoOpen(); } }, config.autoOpenAfterMs);
      }
    },
    stop,
  };
}
