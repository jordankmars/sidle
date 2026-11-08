import { detectAxis } from "./axis";
import { rubber } from "./math";
import { resolveRelease } from "./release";
import type { Side, SideConfig, Sides, Sign } from "./sides";
import {
	createSpring,
	isSpringAtRest,
	type SpringConfig,
	type SpringState,
	stepSpring,
} from "./spring";
import { createVelocityTracker } from "./velocity";

export interface Point {
	x: number;
	y: number;
	/** Event timestamp in ms. */
	time: number;
}

export type Phase =
	/** At rest, open or closed. */
	| "idle"
	/** Pointer is down but hasn't moved far enough to pick an axis. */
	| "pending"
	/** Following a horizontal drag. */
	| "dragging"
	/** Springing towards open or closed. */
	| "settling";

export interface SwipeState {
	phase: Phase;
	/** Horizontal offset of the row content in px. */
	offset: number;
	/** The side the row is open to, or heading to. */
	openSide: Side | null;
}

export interface SwipeLayout {
	/** Width of the row in px. */
	rowWidth: number;
	start?: SideConfig;
	end?: SideConfig;
}

export interface SwipeMachineOptions {
	spring?: Partial<SpringConfig>;
	/** Jump straight to targets instead of animating. */
	reducedMotion?: boolean;
}

export interface SwipeMachine {
	down(point: Point): void;
	move(point: Point): void;
	up(point: Point): void;
	/** The pointer was taken away (pointercancel). Return to where the row was. */
	cancel(): void;
	/** Advance animations by `dt` seconds. */
	tick(dt: number): void;
	open(side: Side): void;
	close(): void;
	setLayout(layout: SwipeLayout): void;
	getState(): SwipeState;
	subscribe(listener: (state: SwipeState) => void): () => void;
	/** True while the row is animating and wants `tick` called every frame. */
	readonly needsFrame: boolean;
}

export const DEFAULT_SPRING: SpringConfig = {
	duration: 0.42,
	bounce: 0,
	rest: 0.3,
};

/** Rubber-band limit past the furthest a side can travel. */
const OVERSCROLL = 40;
const START_SIGN: Sign = 1;

interface Gesture {
	x: number;
	y: number;
	startOffset: number;
	axis: "x" | "y" | null;
}

export function createSwipeMachine(
	options: SwipeMachineOptions = {},
): SwipeMachine {
	const springConfig = { ...DEFAULT_SPRING, ...options.spring };
	const reducedMotion = options.reducedMotion ?? false;
	const listeners = new Set<(state: SwipeState) => void>();
	const tracker = createVelocityTracker();

	let layout: SwipeLayout = { rowWidth: 0 };
	let spring: SpringState = createSpring(0);
	let animating = false;
	let gesture: Gesture | null = null;
	let state: SwipeState = { phase: "idle", offset: 0, openSide: null };

	const signOf = (side: Side): Sign =>
		(side === "start" ? START_SIGN : -START_SIGN) as Sign;
	const sides = (): Sides => ({ start: layout.start, end: layout.end });

	function emit(patch: Partial<SwipeState>) {
		const next = { ...state, ...patch };
		if (
			next.phase === state.phase &&
			next.offset === state.offset &&
			next.openSide === state.openSide
		) {
			return;
		}
		state = next;
		for (const listener of listeners) listener(state);
	}

	function restingPhase(): Phase {
		return gesture ? "pending" : "idle";
	}

	/** Spring to an offset, optionally carrying a release velocity. */
	function settle(to: number, openSide: Side | null, velocity?: number) {
		spring = { x: spring.x, v: velocity ?? spring.v, to };
		if (reducedMotion || isSpringAtRest(spring, springConfig)) {
			spring = createSpring(to);
			animating = false;
			emit({ phase: restingPhase(), offset: to, openSide });
			return;
		}
		animating = true;
		emit({ phase: gesture ? "pending" : "settling", openSide });
	}

	/** How far a drag can go towards a side before rubber-banding. */
	function maxTravel(config: SideConfig | undefined): number {
		if (!config) return 0;
		return config.commit ? layout.rowWidth : config.width;
	}

	function dragOffset(raw: number): number {
		const side: Side = Math.sign(raw) === START_SIGN ? "start" : "end";
		const max = maxTravel(layout[side]);
		const distance = Math.abs(raw);
		if (distance <= max) return raw;
		return Math.sign(raw) * (max + rubber(distance - max, OVERSCROLL));
	}

	return {
		down(point) {
			gesture = {
				x: point.x,
				y: point.y,
				startOffset: spring.x,
				axis: null,
			};
			tracker.reset();
			emit({ phase: "pending" });
		},

		move(point) {
			if (!gesture) return;
			const dx = point.x - gesture.x;
			const dy = point.y - gesture.y;

			if (!gesture.axis) {
				gesture.axis = detectAxis(dx, dy);
				if (!gesture.axis) return;
				if (gesture.axis === "y") {
					// Vertical: let the page scroll and stay out of the way.
					gesture = null;
					emit({ phase: animating ? "settling" : "idle" });
					return;
				}
			}

			const offset = dragOffset(gesture.startOffset + dx);
			spring = { x: offset, v: 0, to: spring.to };
			animating = false;
			tracker.add(offset, point.time);
			emit({ phase: "dragging", offset });
		},

		up() {
			if (!gesture) return;
			const wasDrag = gesture.axis === "x";
			gesture = null;

			if (!wasDrag) {
				// A tap on an open row closes it.
				if (spring.to !== 0 || spring.x !== 0) settle(0, null);
				else emit({ phase: animating ? "settling" : "idle" });
				return;
			}

			const velocity = tracker.velocity();
			const release = resolveRelease({
				offset: spring.x,
				velocity,
				rowWidth: layout.rowWidth,
				sides: sides(),
				startSign: START_SIGN,
			});
			if (release.type === "close") {
				settle(0, null, velocity);
			} else {
				const config = layout[release.side];
				if (config)
					settle(signOf(release.side) * config.width, release.side, velocity);
			}
		},

		cancel() {
			if (!gesture) return;
			gesture = null;
			settle(spring.to, state.openSide);
		},

		tick(dt) {
			if (!animating) return;
			spring = stepSpring(spring, springConfig, dt);
			if (spring.x === spring.to && spring.v === 0) {
				animating = false;
				emit({ phase: restingPhase(), offset: spring.x });
			} else {
				emit({ offset: spring.x });
			}
		},

		open(side) {
			const config = layout[side];
			if (!config || gesture?.axis === "x") return;
			settle(signOf(side) * config.width, side);
		},

		close() {
			if (gesture?.axis === "x") return;
			settle(0, null);
		},

		setLayout(next) {
			layout = next;
			// Keep an open row pinned to its side if the action widths change.
			if (!gesture && !animating && state.openSide) {
				const config = layout[state.openSide];
				const to = config ? signOf(state.openSide) * config.width : 0;
				spring = createSpring(to);
				emit({ offset: to, openSide: config ? state.openSide : null });
			}
		},

		getState: () => state,

		subscribe(listener) {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},

		get needsFrame() {
			return animating;
		},
	};
}
