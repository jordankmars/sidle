export function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

/**
 * Rubber-band resistance. Past an edge, movement keeps going but approaches
 * `limit` and never reaches it. The first few pixels feel close to 1:1.
 */
export function rubber(overshoot: number, limit: number): number {
	if (overshoot <= 0 || limit <= 0) return 0;
	return limit * (1 - 1 / ((overshoot * 0.55) / limit + 1));
}
