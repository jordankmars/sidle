import type { Direction } from "./direction";

export interface EdgeZone {
	/** Width in px of the zone along the leading screen edge. 0 turns it off. */
	size: number;
	/** Needed to find the leading edge in right-to-left layouts. */
	viewportWidth?: number;
	dir?: Direction;
}

/**
 * Whether a pointer landed where the OS owns the gesture. iOS Safari uses a
 * swipe in from the leading edge for "back", and fighting it feels broken.
 */
export function inEdgeZone(
	x: number,
	{ size, viewportWidth, dir = "ltr" }: EdgeZone,
): boolean {
	if (size <= 0) return false;
	if (dir === "ltr") return x < size;
	return viewportWidth !== undefined && x > viewportWidth - size;
}
