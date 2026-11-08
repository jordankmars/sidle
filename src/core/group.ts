import type { SwipeMachine, SwipeSnapshot } from "./machine";

export interface SwipeGroup {
	/**
	 * Add a row to the group. If this id was the open row when it was last
	 * removed, it comes back open. Returns a function that removes it.
	 */
	register(id: string, machine: SwipeMachine): () => void;
	/** Close every row, or every row but one. */
	closeAll(except?: string): void;
	/** The row that is open, or opening, if any. It may currently be unmounted. */
	readonly openId: string | null;
}

/**
 * Keeps at most one row in a list open. Grabbing or opening a row closes the
 * rest, the way Mail does. It never listens to the document itself; call
 * `closeAll()` when the user taps outside the list.
 *
 * The open row is remembered by id rather than by machine, so a virtualized
 * list can unmount a row as it scrolls away and get it back open later.
 */
export function createSwipeGroup(): SwipeGroup {
	const machines = new Map<string, SwipeMachine>();
	let open: { id: string; snapshot: SwipeSnapshot } | null = null;

	function closeAll(except?: string) {
		for (const [id, machine] of machines) {
			if (id !== except) machine.close();
		}
		if (open && open.id !== except) open = null;
	}

	return {
		register(id, machine) {
			machines.set(id, machine);
			if (open?.id === id) machine.restore(open.snapshot);
			let previous = machine.getState();

			const unsubscribe = machine.subscribe((state) => {
				const grabbed =
					state.phase === "dragging" && previous.phase !== "dragging";
				const opened = state.openSide !== null && previous.openSide === null;
				previous = state;

				if (grabbed || opened) closeAll(id);
				const snapshot = machine.snapshot();
				if (snapshot.openSide) open = { id, snapshot };
				else if (open?.id === id) open = null;
			});

			return () => {
				unsubscribe();
				if (machines.get(id) === machine) machines.delete(id);
			};
		},
		closeAll,
		get openId() {
			return open?.id ?? null;
		},
	};
}
