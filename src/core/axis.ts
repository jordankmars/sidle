export type Axis = "x" | "y";

/** How far the pointer has to travel before we decide which way it is going. */
export const AXIS_SLOP = 6;

/**
 * Decides which axis a drag belongs to once it has moved far enough to tell.
 * Returns null while it is still too early to say.
 */
export function detectAxis(
	dx: number,
	dy: number,
	slop: number = AXIS_SLOP,
): Axis | null {
	if (Math.hypot(dx, dy) < slop) return null;
	return Math.abs(dx) > Math.abs(dy) ? "x" : "y";
}
