import {
	type ComponentPropsWithoutRef,
	forwardRef,
	useRef,
	useState,
} from "react";
import type { Side } from "../core";
import {
	PanelContext,
	useComposedRef,
	useIsomorphicLayoutEffect,
	useRowController,
} from "./context";
import type { PanelEntry } from "./controller";

export interface ActionsProps extends ComponentPropsWithoutRef<"div"> {
	side: Side;
	/** Px the row opens to on this side. Defaults to 75 per action. */
	width?: number;
}

export const Actions = forwardRef<HTMLDivElement, ActionsProps>(
	function Actions({ side, width, style, children, ...props }, forwardedRef) {
		const controller = useRowController("Actions");
		const [panel] = useState<PanelEntry>(() => ({
			side,
			element: null,
			width,
			actions: new Set(),
		}));
		const panelRef = useRef<HTMLDivElement>(null);
		const ref = useComposedRef(panelRef, forwardedRef);

		useIsomorphicLayoutEffect(() => {
			panel.element = panelRef.current;
			panel.side = side;
			return controller.addPanel(panel);
		}, [controller, panel, side]);

		// Separate from the effect above, which would briefly remove the panel and
		// close an open row every time the width changed.
		useIsomorphicLayoutEffect(() => {
			panel.width = width;
			controller.measure();
		}, [controller, panel, width]);

		return (
			<PanelContext.Provider value={panel}>
				<div
					{...props}
					ref={ref}
					data-side={side}
					style={{
						position: "absolute",
						top: 0,
						bottom: 0,
						[side === "start" ? "insetInlineStart" : "insetInlineEnd"]: 0,
						display: "flex",
						overflow: "hidden",
						width: 0,
						...style,
					}}
				>
					{children}
				</div>
			</PanelContext.Provider>
		);
	},
);
