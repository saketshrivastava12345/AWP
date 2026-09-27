/**
 * A tiny damped spring for the animated caret: the bar glides to the new
 * cursor position instead of teleporting. Pure and framework-free, so the
 * physics is unit-tested apart from the DOM.
 *
 * Semi-implicit (symplectic) Euler with fixed sub-steps: stable at any frame
 * time the browser hands us (a tab coming back from the background can
 * deliver a 500 ms frame), and cheap enough to run per animation frame.
 */

export type SpringConfig = {
  /** Kilograms, notionally. Heavier springs move slower. */
  mass: number;
  /** Pull towards the target. Higher snaps faster. */
  stiffness: number;
  /** Resistance to motion. Below critical damping the spring overshoots. */
  damping: number;
};

export type SpringState = {
  position: number;
  velocity: number;
};

/**
 * The caret's spring: quick, with a whisper of overshoot so a jump across a
 * word reads as motion rather than a cut. Settles in roughly 250 ms.
 */
export const CARET_SPRING: SpringConfig = { mass: 1, stiffness: 520, damping: 34 };

/** The largest sub-step the integrator takes, in seconds. */
const MAX_STEP_S = 1 / 240;

/** Motion below these thresholds counts as settled. */
export const SETTLE_DISTANCE = 0.05;
export const SETTLE_VELOCITY = 0.5;

/** The damping at which a spring reaches its target fastest without overshoot. */
export function criticalDamping(config: Pick<SpringConfig, "mass" | "stiffness">): number {
  return 2 * Math.sqrt(config.mass * config.stiffness);
}

/**
 * Advances the spring by `dtMs` milliseconds towards `target`. Returns a new
 * state; the input is not mutated. A non-positive or non-finite `dtMs` is a
 * no-op, and a very long frame is split into sub-steps rather than exploding.
 */
export function stepSpring(
  state: SpringState,
  target: number,
  config: SpringConfig,
  dtMs: number,
): SpringState {
  if (!Number.isFinite(dtMs) || dtMs <= 0) return state;
  const seconds = Math.min(dtMs, 1000) / 1000;
  const steps = Math.max(1, Math.ceil(seconds / MAX_STEP_S));
  const h = seconds / steps;
  let { position, velocity } = state;
  for (let i = 0; i < steps; i += 1) {
    const displacement = position - target;
    const acceleration =
      (-config.stiffness * displacement - config.damping * velocity) / config.mass;
    velocity += acceleration * h;
    position += velocity * h;
  }
  return { position, velocity };
}

/** True once the spring is close enough to the target, and slow enough, to stop. */
export function isSettled(state: SpringState, target: number): boolean {
  return (
    Math.abs(state.position - target) < SETTLE_DISTANCE &&
    Math.abs(state.velocity) < SETTLE_VELOCITY
  );
}

/**
 * Runs the spring to rest and reports how long it took and how far it
 * overshot. Used by the tests, and handy when tuning CARET_SPRING.
 */
export function simulate(
  from: number,
  target: number,
  config: SpringConfig,
  frameMs = 1000 / 60,
  maxMs = 5000,
): { settledMs: number; overshoot: number; positions: number[] } {
  let state: SpringState = { position: from, velocity: 0 };
  const positions: number[] = [];
  const direction = Math.sign(target - from) || 1;
  let overshoot = 0;
  let elapsed = 0;
  while (elapsed < maxMs) {
    state = stepSpring(state, target, config, frameMs);
    elapsed += frameMs;
    positions.push(state.position);
    overshoot = Math.max(overshoot, (state.position - target) * direction);
    if (isSettled(state, target)) break;
  }
  return { settledMs: elapsed, overshoot, positions };
}
