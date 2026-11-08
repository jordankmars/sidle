import type { SwipeMachine } from "./machine";

export interface SwipeGroup {
	/** Add a row to the group. Returns a function that removes it. */
	register(id: string, machine: SwipeMachine): () => void;
	/** Close every row, or every row but one. */
	closeAll(except?: string): void;
	/** The row that is open, or opening, if any. */
	readonly openId: string | null;
}

/**
 * Keeps at most one row in a list open. Grabbing or opening a row closes the
 * rest, the way Mail does. It never listens to the document itself; call
 * `closeAll()` when the user taps outside the list.
 */
export function createSwipeGroup(): SwipeGroup {
	const machines = new Map<string, SwipeMachine>();
	let openId: string | null = null;

	function closeAll(except?: string) {
		for (const [id, machine] of machines) {
			if (id !== except) machine.close();
		}
		if (openId !== except) openId = null;
	}

	return {
		register(id, machine) {
			machines.set(id, machine);
			let previous = machine.getState();

			const unsubscribe = machine.subscribe((state) => {
				const grabbed =
					state.phase === "dragging" && previous.phase !== "dragging";
				const opened = state.openSide !== null && previous.openSide === null;
				previous = state;

				if (grabbed || opened) closeAll(id);
				if (state.phase === "committed" || state.openSide === null) {
					if (openId === id) openId = null;
				} else {
					openId = id;
				}
			});

			return () => {
				unsubscribe();
				if (machines.get(id) === machine) machines.delete(id);
				if (openId === id) openId = null;
			};
		},
		closeAll,
		get openId() {
			return openId;
		},
	};
}
