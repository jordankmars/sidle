import { type ComponentPropsWithoutRef, forwardRef, useRef } from "react";
import {
	useComposedRef,
	useIsomorphicLayoutEffect,
	useRowController,
} from "./context";

export type ContentProps = ComponentPropsWithoutRef<"div">;

export const Content = forwardRef<HTMLDivElement, ContentProps>(
	function Content(
		{ style, onPointerDown, onClickCapture, onDragStart, onKeyDown, ...props },
		forwardedRef,
	) {
		const controller = useRowController("Content");
		const contentRef = useRef<HTMLDivElement>(null);
		const ref = useComposedRef(contentRef, forwardedRef);

		useIsomorphicLayoutEffect(() => {
			controller.setContent(contentRef.current);
			return () => controller.setContent(null);
		}, [controller]);

		return (
			// biome-ignore lint/a11y/useSemanticElements: a fieldset would drag in form semantics
			<div
				role="group"
				// biome-ignore lint/a11y/noNoninteractiveTabindex: rows are focusable so their shortcuts work
				tabIndex={0}
				{...props}
				ref={ref}
				data-tuckaway-content=""
				style={{
					position: "relative",
					zIndex: 1,
					touchAction: "pan-y",
					userSelect: "none",
					WebkitUserSelect: "none",
					...style,
				}}
				onKeyDown={(event) => {
					onKeyDown?.(event);
					if (!event.defaultPrevented) controller.keyDown(event);
				}}
				onPointerDown={(event) => {
					onPointerDown?.(event);
					controller.pointerDown(event);
				}}
				onClickCapture={(event) => {
					if (!controller.clickCapture(event)) onClickCapture?.(event);
				}}
				onDragStart={(event) => {
					onDragStart?.(event);
					// Links and images would otherwise start a native drag instead of a swipe.
					event.preventDefault();
				}}
			/>
		);
	},
);
