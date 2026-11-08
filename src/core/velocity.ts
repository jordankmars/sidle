/** Only the last stretch of a drag says anything about how it was released. */
const WINDOW_MS = 90;

export interface VelocityTracker {
	/** Record a position (px) at a time (ms). */
	add(x: number, time: number): void;
	/** Velocity in px per second over the recent window. */
	velocity(): number;
	reset(): void;
}

export function createVelocityTracker(): VelocityTracker {
	const points: Array<[x: number, time: number]> = [];

	return {
		add(x, time) {
			points.push([x, time]);
			while (points.length > 2 && time - points[0][1] > WINDOW_MS) {
				points.shift();
			}
		},
		velocity() {
			if (points.length < 2) return 0;
			const [x0, t0] = points[0];
			const [x1, t1] = points[points.length - 1];
			return t1 > t0 ? (x1 - x0) / ((t1 - t0) / 1000) : 0;
		},
		reset() {
			points.length = 0;
		},
	};
}
