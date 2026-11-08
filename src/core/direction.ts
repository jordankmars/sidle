import type { Side, Sign } from "./sides";

export type Direction = "ltr" | "rtl";

/**
 * Sign of the offset that reveals the start side. In left-to-right layouts the
 * start actions sit on the left, so content moves right (positive) to show them.
 */
export function startSign(dir: Direction = "ltr"): Sign {
	return dir === "rtl" ? -1 : 1;
}

/** Sign of the offset that reveals a given side. */
export function signOf(side: Side, dir: Direction = "ltr"): Sign {
	const sign = startSign(dir);
	return side === "start" ? sign : (-sign as Sign);
}

/** Which side an offset is revealing, or null at rest. */
export function sideOf(offset: number, dir: Direction = "ltr"): Side | null {
	if (offset === 0) return null;
	return Math.sign(offset) === startSign(dir) ? "start" : "end";
}
