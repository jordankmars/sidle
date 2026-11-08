import {
	type ComponentPropsWithoutRef,
	forwardRef,
	useId,
	useRef,
	useState,
} from "react";
import type { Direction } from "../core";
import {
	RowContext,
	useComposedRef,
	useIsomorphicLayoutEffect,
} from "./context";
import { createRowController } from "./controller";
import { getPageGroup } from "./group";

export interface RowProps extends ComponentPropsWithoutRef<"div"> {
	/**
	 * Identifies this row within its group. Generated if left out, but a
	 * virtualized list must pass something stable so rows come back open.
	 */
	value?: string;
	/** Writing direction. Read from the DOM if left out. */
	dir?: Direction;
	/**
	 * Ignore swipes starting this close (px) to the leading screen edge, leaving
	 * them to the iOS back gesture. 0 turns it off.
	 */
	edgeGuard?: number;
}

export const Row = forwardRef<HTMLDivElement, RowProps>(function Row(
	{ value, dir, edgeGuard = 24, style, children, ...props },
	forwardedRef,
) {
	const generated = useId();
	const id = value ?? generated;
	const group = getPageGroup();
	const [controller] = useState(createRowController);
	const rowRef = useRef<HTMLDivElement>(null);
	const ref = useComposedRef(rowRef, forwardedRef);

	useIsomorphicLayoutEffect(() => {
		if (!rowRef.current) return;
		return controller.connect({ row: rowRef.current, id, group, edgeGuard });
	}, [controller, id, group, edgeGuard]);

	// A ResizeObserver can't see the direction change.
	useIsomorphicLayoutEffect(() => {
		controller.setDir(dir);
	}, [controller, dir]);

	return (
		<RowContext.Provider value={controller}>
			<div
				{...props}
				ref={ref}
				dir={dir}
				data-sidle-row=""
				style={{ position: "relative", overflow: "hidden", ...style }}
			>
				{children}
			</div>
		</RowContext.Provider>
	);
});
