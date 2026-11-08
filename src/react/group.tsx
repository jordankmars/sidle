import { createContext, type ReactNode, useContext, useState } from "react";
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
	const rows = new Set<Element>();

	function onPointerDown({ target }: PointerEvent) {
		// A row in another group doesn't count: each group keeps its own open row.
		if (!(target instanceof Element && target.closest("[data-sidle-row]"))) {
			swipe.closeAll();
		}
	}

	return {
		swipe,
		addRow(element) {
			if (rows.size === 0) {
				document.addEventListener("pointerdown", onPointerDown);
			}
			rows.add(element);
			return () => {
				rows.delete(element);
				if (rows.size === 0) {
					document.removeEventListener("pointerdown", onPointerDown);
				}
			};
		},
		neighbor(element) {
			// Rows on their way out can't take focus.
			const live = ([...rows] as HTMLElement[])
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

const GroupContext = createContext<GroupController | null>(null);

export function useGroupController(): GroupController {
	return useContext(GroupContext) ?? getPageGroup();
}

export interface GroupProps {
	children?: ReactNode;
}

/**
 * Keeps one row open among the rows inside it, separately from the rest of the
 * page. Rows outside any `Group` share one group for the whole page.
 */
export function Group({ children }: GroupProps) {
	const [controller] = useState(createGroupController);
	return (
		<GroupContext.Provider value={controller}>{children}</GroupContext.Provider>
	);
}
