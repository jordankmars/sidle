import { createSwipeGroup, type SwipeGroup } from "../core";

export interface GroupController {
	swipe: SwipeGroup;
	/** Track a mounted row's element. Returns a function that stops tracking it. */
	addRow(element: HTMLElement): () => void;
	/** The row to move focus to when this one goes away: the next, else the previous. */
	neighbor(element: HTMLElement): HTMLElement | null;
}

export function createGroupController(): GroupController {
	const swipe = createSwipeGroup();
	const rows = new Set<HTMLElement>();

	return {
		swipe,
		addRow(element) {
			rows.add(element);
			return () => {
				rows.delete(element);
			};
		},
		neighbor(element) {
			// Rows on their way out can't take focus.
			const live = [...rows]
				.filter((row) => row === element || row.dataset.phase !== "committed")
				.sort((a, b) =>
					a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING
						? -1
						: 1,
				);
			const index = live.indexOf(element);
			return live[index + 1] ?? live[index - 1] ?? null;
		},
	};
}

let pageGroup: GroupController | undefined;

/** The group shared by every row that isn't inside a `Group`. */
export function getPageGroup(): GroupController {
	pageGroup ??= createGroupController();
	return pageGroup;
}
