import type {
	KeyboardEvent,
	MouseEvent,
	PointerEvent as ReactPointerEvent,
} from "react";
import {
	createSwipeMachine,
	type Direction,
	type Point,
	type Side,
	type SideConfig,
	type SwipeMachine,
	type SwipeState,
} from "../core";
import { sideOf } from "../core/direction";
import { collapseRow } from "./collapse";
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
	disabled: boolean;
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
	keyDown(event: KeyboardEvent<HTMLElement>): void;
	/** Close the row and put focus back on its content. */
	dismiss(): void;
	pointerDown(event: ReactPointerEvent<HTMLElement>): void;
	/** Returns true if this click was the tail end of a swipe and was swallowed. */
	clickCapture(event: MouseEvent<HTMLElement>): boolean;
}

function toPoint(
	event: Pick<PointerEvent, "clientX" | "clientY" | "timeStamp" | "pointerId">,
): Point {
	return {
		x: event.clientX,
		y: event.clientY,
		time: event.timeStamp,
		id: event.pointerId,
	};
}

const canCommit = (action: ActionEntry) => action.commit && !action.disabled;

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
	let closeOthers: (() => boolean) | null = null;
	/** This press closed another row, so it shouldn't activate this one too. */
	let dismissed = false;
	let reducedMotion = false;
	/** The commit action picked by tap or shortcut. A full swipe leaves it empty. */
	let chosenCommit: ActionEntry | undefined;
	/** Removes the window listeners that follow a press. */
	let stopFollowing: (() => void) | null = null;

	/** The action a full swipe on this side commits. */
	function mainAction(side: Side): ActionEntry | undefined {
		return [...(panels[side]?.actions ?? [])].filter(canCommit).at(-1);
	}

	function focusContent() {
		if (document.activeElement !== content) content?.focus();
	}

	function activate(panel: PanelEntry, action: ActionEntry) {
		if (!machine) return;
		const { phase } = machine.getState();
		if (phase === "committing" || phase === "committed") return;
		if (action.commit) {
			chosenCommit = action;
			machine.commit(panel.side);
			return;
		}
		action.select();
		machine.close();
		// The button is about to be hidden, so don't leave focus on it.
		if (rowElement?.contains(document.activeElement)) focusContent();
	}

	function publishShortcuts() {
		if (!content) return;
		const keys = SIDES.flatMap((side) =>
			[...(panels[side]?.actions ?? [])]
				.filter((action) => !action.disabled)
				.flatMap((action) => action.shortcuts),
		).map((key) => (key === " " ? "Space" : key));
		setAttribute(
			content,
			"aria-keyshortcuts",
			keys.length > 0 ? keys.join(" ") : null,
		);
	}

	function sideConfig(side: Side): SideConfig | undefined {
		const panel = panels[side];
		if (!panel || panel.actions.size === 0) return undefined;
		const actions = [...panel.actions];
		return {
			width: panel.width ?? actions.length * ACTION_WIDTH,
			commit: actions.some(canCommit),
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
		publishShortcuts();
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

	function pointerMove(event: PointerEvent) {
		if (!machine) return;
		const wasDragging = machine.getState().phase === "dragging";
		machine.move(toPoint(event));
		// Once the drag is ours, the click that follows it should land on the row.
		if (!wasDragging && machine.getState().phase === "dragging") {
			content?.setPointerCapture(event.pointerId);
		}
	}

	/** Stop following unless another pointer is still driving the row. */
	function finishPress() {
		const phase = machine?.getState().phase;
		if (phase !== "pending" && phase !== "dragging") stopFollowing?.();
	}

	function pointerUp(event: PointerEvent) {
		swiped = (machine?.up(toPoint(event)) ?? false) || dismissed;
		finishPress();
	}

	function pointerCancel() {
		machine?.cancel();
		finishPress();
	}

	/**
	 * Listen on the window, since a fast flick can be off the row before the first
	 * move. Capturing the pointer on press would solve that too, but would take
	 * clicks away from links and buttons inside the row.
	 */
	function followPress() {
		if (stopFollowing) return;
		const options = { capture: true };
		window.addEventListener("pointermove", pointerMove, options);
		window.addEventListener("pointerup", pointerUp, options);
		window.addEventListener("pointercancel", pointerCancel, options);
		stopFollowing = () => {
			window.removeEventListener("pointermove", pointerMove, options);
			window.removeEventListener("pointerup", pointerUp, options);
			window.removeEventListener("pointercancel", pointerCancel, options);
			stopFollowing = null;
		};
	}

	return {
		connect({ row, id, group, edgeGuard }) {
			rowElement = row;
			closeOthers = () => group.closeOthers(row, id);
			let disposing = false;
			let finishCollapse: (() => void) | undefined;
			reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
			const current = createSwipeMachine({
				reducedMotion,
				edgeGuard,
				onCommit(side) {
					const action = chosenCommit ?? mainAction(side);
					chosenCommit = undefined;
					const done = () => {
						// Removing the row would drop focus on the floor, so pass it along.
						if (!disposing && row.contains(document.activeElement)) {
							group
								.neighbor(row)
								?.querySelector<HTMLElement>("[data-sidle-content]")
								?.focus();
						}
						action?.select();
					};
					// Already on its way out of the page, so there's nothing to animate.
					if (disposing) done();
					else finishCollapse = collapseRow(row, { reducedMotion }, done);
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
				disposing = true;
				stopFollowing?.();
				// Settle first so a commit in flight lands and the group sees the final state.
				current.destroy();
				finishCollapse?.();
				leaveGroup();
				stopTracking();
				stopLoop();
				unsubscribe();
				resize.disconnect();
				machine = null;
				rowElement = null;
				closeOthers = null;
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

		activate,

		setDir(dir) {
			dirProp = dir;
			measure();
		},

		measure,

		dismiss() {
			machine?.close();
			focusContent();
		},

		keyDown(event) {
			if (!machine || event.target !== event.currentTarget) return;
			// Leave browser and OS shortcuts alone.
			if (event.ctrlKey || event.metaKey || event.altKey) return;

			const pressed = event.key.toLowerCase();
			for (const side of SIDES) {
				const panel = panels[side];
				for (const action of panel?.actions ?? []) {
					if (
						panel &&
						!action.disabled &&
						action.shortcuts.some((k) => k.toLowerCase() === pressed)
					) {
						event.preventDefault();
						// Holding a key mustn't run the action again, or delete the whole list.
						if (!event.repeat) activate(panel, action);
						return;
					}
				}
			}

			const { openSide } = machine.getState();
			if (event.key === "Escape" && openSide) {
				event.preventDefault();
				machine.close();
			} else if (event.key === "Enter") {
				event.preventDefault();
				if (!event.repeat) event.currentTarget.click();
			} else if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
				if (!dirProp) measure();
				const side = sideOf(event.key === "ArrowRight" ? 1 : -1, direction);
				if (!side) return;
				event.preventDefault();
				if (openSide && openSide !== side) machine.close();
				else machine.open(side);
			}
		},

		pointerDown(event) {
			if (event.button !== 0) return;
			swiped = false;
			// Before the machine sees it, so a press inside the edge guard counts too.
			dismissed = closeOthers?.() ?? false;
			// Direction can change on an ancestor without anything telling us.
			if (!dirProp) measure();
			machine?.down(toPoint(event));
			followPress();
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
