import { type Direction, sideOf } from "./direction";
import type { Side, Sides } from "./sides";

/** Past this fraction of the row width, letting go commits the main action. */
export const COMMIT_RATIO = 0.6;
/** How far ahead (in seconds) to project a release, so a flick goes further than a drag. */
export const PROJECTION = 0.15;
/** The same for committing. Shorter, so a flick helps without deleting rows by accident. */
export const COMMIT_MOMENTUM = 0.05;

export type Release =
	| { type: "close" }
	| { type: "open"; side: Side }
	| { type: "commit"; side: Side };

export interface ReleaseInput {
	offset: number;
	/** px per second, same sign convention as offset. */
	velocity: number;
	rowWidth: number;
	sides: Sides;
	dir?: Direction;
	/** Seconds of release speed that count towards a commit. 0 goes by distance alone. */
	commitMomentum?: number;
}

/**
 * The side whose main action would commit if the row were released now, if any.
 * Used both on release and while dragging, to let the main action fill the row.
 */
export function armedSide({
	offset,
	rowWidth,
	sides,
	dir,
}: Omit<ReleaseInput, "velocity">): Side | null {
	const side = sideOf(offset, dir);
	if (!side || !sides[side]?.commit) return null;
	return Math.abs(offset) > rowWidth * COMMIT_RATIO ? side : null;
}

/** Decides where a row goes when the pointer lets go. */
export function resolveRelease(input: ReleaseInput): Release {
	const {
		offset,
		velocity,
		sides,
		dir,
		commitMomentum = COMMIT_MOMENTUM,
	} = input;

	const armed = armedSide(input);
	if (armed) return { type: "commit", side: armed };

	// A flick can commit early, but only once it has cleared the side's actions.
	const flung = armedSide({
		...input,
		offset: offset + velocity * commitMomentum,
	});
	if (
		flung &&
		flung === sideOf(offset, dir) &&
		Math.abs(offset) >= (sides[flung]?.width ?? 0)
	) {
		return { type: "commit", side: flung };
	}

	const projected = offset + velocity * PROJECTION;
	const side = sideOf(projected, dir);
	const config = side && sides[side];
	if (side && config && Math.abs(projected) > config.width / 2) {
		return { type: "open", side };
	}
	return { type: "close" };
}
