import type { MouseEvent, PointerEvent } from "react";
import {
	createSwipeMachine,
	type Direction,
	type Point,
	type Side,
	type SideConfig,
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

/** One `Action`. Fields are kept current by the component. */
export interface ActionEntry {
	element: HTMLElement | null;
	commit: boolean;
	shortcuts: string[];
	select(): void;
}

/** One `Actions` panel. Fields are kept current by the component. */
export interface PanelEntry {
	side: Side;
	element: HTMLElement | null;
	/** Px the row opens to. Falls back to a width per action. */
	width: number | undefined;
	actions: Set<ActionEntry>;
}

/** How wide each action is when the panel doesn't set a width. */
export const ACTION_WIDTH = 75;
const SIDES: Side[] = ["start", "end"];

/** Everything a row's parts share. One per `Row`, living as long as it does. */
export interface RowController {
	/** Create the machine and hook it to the page. Returns a function that undoes it. */
	connect(options: ConnectOptions): () => void;
	setContent(element: HTMLElement | null): void;
	/** Add a panel of actions. Returns a function that removes it. */
	addPanel(panel: PanelEntry): () => void;
	/** Run an action the way a tap on its button does. */
	activate(panel: PanelEntry, action: ActionEntry): void;
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
	const panels: Partial<Record<Side, PanelEntry>> = {};
	let dirProp: Direction | undefined;
	let direction: Direction = "ltr";
	let swiped = false;
	let reducedMotion = false;

	/** The action a full swipe on this side commits. */
	function mainAction(side: Side): ActionEntry | undefined {
		return [...(panels[side]?.actions ?? [])].filter((a) => a.commit).at(-1);
	}

	function sideConfig(side: Side): SideConfig | undefined {
		const panel = panels[side];
		if (!panel || panel.actions.size === 0) return undefined;
		const actions = [...panel.actions];
		return {
			width: panel.width ?? actions.length * ACTION_WIDTH,
			commit: actions.some((action) => action.commit),
		};
	}

	function measure() {
		if (!machine || !rowElement) return;
		direction =
			dirProp ??
			(getComputedStyle(rowElement).direction === "rtl" ? "rtl" : "ltr");
		machine.setLayout({
			rowWidth: rowElement.clientWidth,
			dir: direction,
			viewportWidth: window.innerWidth,
			start: sideConfig("start"),
			end: sideConfig("end"),
		});
		// A new action or a flipped direction changes the DOM without changing the state.
		paint(machine.getState());
	}

	// Painted straight to the DOM: re-rendering React every frame would be wasteful.
	function paint({ offset, phase, openSide, armedSide }: SwipeState) {
		// Offsets are physical px, so flip them to find which side is showing.
		const startward = direction === "rtl" ? -offset : offset;
		if (content)
			content.style.transform = offset ? `translateX(${offset}px)` : "";
		if (rowElement) {
			setAttribute(rowElement, "data-phase", phase);
			setAttribute(rowElement, "data-open-side", openSide);
		}
		for (const side of SIDES) {
			const panel = panels[side];
			if (!panel?.element) continue;
			const revealed = side === "start" ? startward : -startward;
			const armed = armedSide === side;
			panel.element.style.width = `${Math.max(0, revealed)}px`;
			setAttribute(panel.element, "data-armed", armed ? "" : null);
			for (const action of panel.actions) {
				if (!action.element) continue;
				// Squeeze the others out so the main action fills the row.
				if (!action.commit) {
					action.element.style.flexGrow = armed ? "0.0001" : "1";
				}
				if (reducedMotion) action.element.style.transition = "none";
				action.element.setAttribute("tabindex", openSide === side ? "0" : "-1");
			}
		}
	}

	return {
		connect({ row, id, group, edgeGuard }) {
			rowElement = row;
			reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
			const current = createSwipeMachine({
				reducedMotion,
				edgeGuard,
				onCommit(side) {
					mainAction(side)?.select();
				},
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

		addPanel(panel) {
			panels[panel.side] = panel;
			measure();
			return () => {
				if (panels[panel.side] === panel) delete panels[panel.side];
				measure();
			};
		},

		activate(panel, action) {
			if (!machine) return;
			if (action.commit) {
				machine.commit(panel.side);
				return;
			}
			action.select();
			machine.close();
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
