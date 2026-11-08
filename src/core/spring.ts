/**
 * A damped spring described the way designers think about it: how long it
 * takes to settle and how much it bounces, rather than stiffness and damping.
 */
export interface SpringConfig {
	/** Rough settle time in seconds. */
	duration: number;
	/** 0 is critically damped, values towards 1 overshoot more. */
	bounce: number;
	/** Distance from the target (in px) that counts as settled. */
	rest: number;
}

export interface SpringState {
	x: number;
	v: number;
	to: number;
}

/** Long frames (a backgrounded tab, a GC pause) shouldn't fling the spring. */
const MAX_DT = 1 / 30;
/** Integration steps per second. High enough to stay stable at any duration we use. */
const STEPS_PER_SECOND = 600;

export function createSpring(x: number, to = x, v = 0): SpringState {
	return { x, v, to };
}

export function isSpringAtRest(s: SpringState, config: SpringConfig): boolean {
	return Math.abs(s.x - s.to) < config.rest && Math.abs(s.v) < config.rest * 10;
}

/**
 * Advances the spring by `dt` seconds with semi-implicit Euler substeps.
 * Once it is within `rest` of the target it snaps there and stops.
 */
export function stepSpring(
	s: SpringState,
	config: SpringConfig,
	dt: number,
): SpringState {
	const clamped = Math.max(0, Math.min(dt, MAX_DT));
	const steps = Math.max(1, Math.ceil(clamped * STEPS_PER_SECOND));
	const h = clamped / steps;
	const k = ((2 * Math.PI) / config.duration) ** 2;
	const c = (4 * Math.PI * (1 - config.bounce)) / config.duration;

	let { x, v } = s;
	for (let i = 0; i < steps; i++) {
		v += (-k * (x - s.to) - c * v) * h;
		x += v * h;
	}

	const next = { x, v, to: s.to };
	return isSpringAtRest(next, config) ? { x: s.to, v: 0, to: s.to } : next;
}
