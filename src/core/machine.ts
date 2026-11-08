import { detectAxis } from "./axis";
import { type Direction, sideOf, signOf } from "./direction";
import { inEdgeZone } from "./edge";
import { rubber } from "./math";
import { armedSide, resolveRelease } from "./release";
import type { Side, SideConfig, Sides } from "./sides";
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
	| "settling"
	/** Sliding off-screen after a full swipe or a call to `commit`. */
	| "committing"
	/** Off-screen and finished. The row is ready to be collapsed and removed. */
	| "committed";

export interface SwipeState {
	phase: Phase;
	/** Horizontal offset of the row content in px. */
	offset: number;
	/** The side the row is open to, or heading to. */
	openSide: Side | null;
	/** The side whose main action commits if released now, or is committing. */
	armedSide: Side | null;
}

export interface SwipeLayout {
	/** Width of the row in px. */
	rowWidth: number;
	/** Writing direction of the row. `start` is on the right in rtl. Defaults to ltr. */
	dir?: Direction;
	/** Width of the viewport in px. Only needed for `edgeGuard` in rtl. */
	viewportWidth?: number;
	start?: SideConfig;
	end?: SideConfig;
}

export interface SwipeMachineOptions {
	spring?: Partial<SpringConfig>;
	/** Jump straight to targets instead of animating. */
	reducedMotion?: boolean;
	/**
	 * Ignore pointers that start this close (px) to the leading screen edge, so
	 * the iOS swipe-back gesture wins. Off by default.
	 */
	edgeGuard?: number;
	/** Called once the row has finished sliding off-screen. */
	onCommit?: (side: Side) => void;
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
	/** Slide the row off-screen and commit that side's main action. */
	commit(side: Side): void;
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
/** Extra distance past the row edge a committed row travels, so it fully clears. */
const COMMIT_OVERSHOOT = 20;

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
	let committedSide: Side | null = null;
	let state: SwipeState = {
		phase: "idle",
		offset: 0,
		openSide: null,
		armedSide: null,
	};

	const offsetFor = (side: Side, distance: number) =>
		signOf(side, layout.dir) * distance;
	const sides = (): Sides => ({ start: layout.start, end: layout.end });

	function emit(patch: Partial<SwipeState>) {
		const next = { ...state, ...patch };
		if (
			next.phase === state.phase &&
			next.offset === state.offset &&
			next.openSide === state.openSide &&
			next.armedSide === state.armedSide
		) {
			return;
		}
		state = next;
		for (const listener of listeners) listener(state);
	}

	/** The spring has reached its target. */
	function arrive(patch: Partial<SwipeState> = {}) {
		animating = false;
		if (committedSide) {
			emit({ ...patch, phase: "committed", offset: spring.x });
			options.onCommit?.(committedSide);
			return;
		}
		emit({ ...patch, phase: gesture ? "pending" : "idle", offset: spring.x });
	}

	/** Spring to an offset, optionally carrying a release velocity. */
	function settle(to: number, openSide: Side | null, velocity?: number) {
		const armed = committedSide;
		spring = { x: spring.x, v: velocity ?? spring.v, to };
		if (reducedMotion || isSpringAtRest(spring, springConfig)) {
			spring = createSpring(to);
			arrive({ openSide, armedSide: armed });
			return;
		}
		animating = true;
		const moving = committedSide ? "committing" : "settling";
		emit({ phase: gesture ? "pending" : moving, openSide, armedSide: armed });
	}

	function commit(side: Side, velocity?: number) {
		if (!layout[side]?.commit || committedSide) return;
		committedSide = side;
		gesture = null;
		const to = offsetFor(side, layout.rowWidth + COMMIT_OVERSHOOT);
		settle(to, side, velocity);
	}

	/** How far a drag can go towards a side before rubber-banding. */
	function maxTravel(config: SideConfig | undefined): number {
		if (!config) return 0;
		return config.commit ? layout.rowWidth : config.width;
	}

	function dragOffset(raw: number): number {
		const side = sideOf(raw, layout.dir);
		const max = side ? maxTravel(layout[side]) : 0;
		const distance = Math.abs(raw);
		if (distance <= max) return raw;
		return Math.sign(raw) * (max + rubber(distance - max, OVERSCROLL));
	}

	return {
		down(point) {
			if (committedSide) return;
			const edge = {
				size: options.edgeGuard ?? 0,
				viewportWidth: layout.viewportWidth,
				dir: layout.dir,
			};
			if (inEdgeZone(point.x, edge)) return;
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
			emit({
				phase: "dragging",
				offset,
				armedSide: armedSide({
					offset,
					rowWidth: layout.rowWidth,
					sides: sides(),
					dir: layout.dir,
				}),
			});
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
				dir: layout.dir,
			});
			if (release.type === "close") {
				settle(0, null, velocity);
			} else if (release.type === "commit") {
				commit(release.side, velocity);
			} else {
				const config = layout[release.side];
				if (config)
					settle(offsetFor(release.side, config.width), release.side, velocity);
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
				arrive();
			} else {
				emit({ offset: spring.x });
			}
		},

		open(side) {
			const config = layout[side];
			if (!config || committedSide || gesture?.axis === "x") return;
			settle(offsetFor(side, config.width), side);
		},

		close() {
			if (committedSide || gesture?.axis === "x") return;
			settle(0, null);
		},

		commit(side) {
			commit(side);
		},

		setLayout(next) {
			layout = next;
			// Keep an open row pinned to its side if the action widths change.
			if (!gesture && !animating && !committedSide && state.openSide) {
				const config = layout[state.openSide];
				const to = config ? offsetFor(state.openSide, config.width) : 0;
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
