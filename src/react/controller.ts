import type { MouseEvent, PointerEvent } from "react";
import {
	createSwipeMachine,
	type Direction,
	type Point,
	type SwipeMachine,
	type SwipeState,
} from "../core";
import { frameLoop } from "./frame-loop";
import type { GroupController } from "./group";

export interface ConnectOptions {
	row: HTMLElement;
	id: string;
	group: GroupController;
	edgeGuard: number;
}

/** Everything a row's parts share. One per `Row`, living as long as it does. */
export interface RowController {
	/** Create the machine and hook it to the page. Returns a function that undoes it. */
	connect(options: ConnectOptions): () => void;
	setContent(element: HTMLElement | null): void;
	/** Set the `dir` prop. Undefined reads the direction from the DOM instead. */
	setDir(dir: Direction | undefined): void;
	/** Read the row's size and parts again and hand them to the machine. */
	measure(): void;
	pointerDown(event: PointerEvent<HTMLElement>): void;
	pointerMove(event: PointerEvent<HTMLElement>): void;
	pointerUp(event: PointerEvent<HTMLElement>): void;
	pointerCancel(): void;
	/** Returns true if this click was the tail end of a swipe and was swallowed. */
	clickCapture(event: MouseEvent<HTMLElement>): boolean;
}

function toPoint(event: PointerEvent): Point {
	return {
		x: event.clientX,
		y: event.clientY,
		time: event.timeStamp,
		id: event.pointerId,
	};
}

function setAttribute(element: Element, name: string, value: string | null) {
	if (value === null) element.removeAttribute(name);
	else element.setAttribute(name, value);
}

export function createRowController(): RowController {
	let machine: SwipeMachine | null = null;
	let rowElement: HTMLElement | null = null;
	let content: HTMLElement | null = null;
	let dirProp: Direction | undefined;
	let direction: Direction = "ltr";
	let swiped = false;

	function measure() {
		if (!machine || !rowElement) return;
		direction =
			dirProp ??
			(getComputedStyle(rowElement).direction === "rtl" ? "rtl" : "ltr");
		machine.setLayout({
			rowWidth: rowElement.clientWidth,
			dir: direction,
			viewportWidth: window.innerWidth,
		});
	}

	// Painted straight to the DOM: re-rendering React every frame would be wasteful.
	function paint({ offset, phase, openSide }: SwipeState) {
		if (content)
			content.style.transform = offset ? `translateX(${offset}px)` : "";
		if (rowElement) {
			setAttribute(rowElement, "data-phase", phase);
			setAttribute(rowElement, "data-open-side", openSide);
		}
	}

	return {
		connect({ row, id, group, edgeGuard }) {
			rowElement = row;
			const current = createSwipeMachine({
				reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
				edgeGuard,
			});
			machine = current;
			measure();

			const resize = new ResizeObserver(measure);
			resize.observe(row);
			const unsubscribe = current.subscribe((state) => {
				paint(state);
				frameLoop.wake();
			});
			const stopLoop = frameLoop.add(current);
			const stopTracking = group.addRow(row);
			const leaveGroup = group.swipe.register(id, current);
			paint(current.getState());

			return () => {
				// Settle first so the group sees the final state.
				current.destroy();
				leaveGroup();
				stopTracking();
				stopLoop();
				unsubscribe();
				resize.disconnect();
				machine = null;
				rowElement = null;
			};
		},

		setContent(element) {
			content = element;
		},

		setDir(dir) {
			dirProp = dir;
			measure();
		},

		measure,

		pointerDown(event) {
			if (event.button !== 0) return;
			swiped = false;
			// Direction can change on an ancestor without anything telling us.
			if (!dirProp) measure();
			machine?.down(toPoint(event));
		},

		pointerMove(event) {
			if (!machine) return;
			const wasDragging = machine.getState().phase === "dragging";
			machine.move(toPoint(event));
			// Once the drag is ours, keep getting events even if the pointer leaves the row.
			if (!wasDragging && machine.getState().phase === "dragging") {
				event.currentTarget.setPointerCapture(event.pointerId);
			}
		},

		pointerUp(event) {
			swiped = machine?.up(toPoint(event)) ?? false;
		},

		pointerCancel() {
			machine?.cancel();
		},

		clickCapture(event) {
			// A click from the keyboard has a detail of 0 and is never a swipe's tail.
			const swallow = swiped && event.detail !== 0;
			swiped = false;
			if (swallow) {
				event.preventDefault();
				event.stopPropagation();
			}
			return swallow;
		},
	};
}
