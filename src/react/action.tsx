import {
	type ComponentPropsWithoutRef,
	forwardRef,
	useRef,
	useState,
} from "react";
import {
	useComposedRef,
	useIsomorphicLayoutEffect,
	usePanel,
	useRowController,
} from "./context";
import type { ActionEntry } from "./controller";

export interface ActionProps
	extends Omit<ComponentPropsWithoutRef<"button">, "onSelect"> {
	/**
	 * Runs when the action is chosen. For a `commit` action that is after the
	 * row has collapsed, so it is safe to remove the row from your list here.
	 */
	onSelect: () => void;
	/** Make this the side's main action: a full swipe runs it and removes the row. */
	commit?: boolean;
	/** A key, or keys, that run this action while the row has focus. */
	shortcut?: string | string[];
}

export const Action = forwardRef<HTMLButtonElement, ActionProps>(
	function Action(
		{
			onSelect,
			commit = false,
			disabled = false,
			shortcut,
			style,
			onClick,
			onKeyDown,
			...props
		},
		forwardedRef,
	) {
		const controller = useRowController("Action");
		const panel = usePanel();
		const [entry] = useState<ActionEntry>(() => ({
			element: null,
			commit,
			disabled,
			shortcuts: [],
			select: onSelect,
		}));
		const buttonRef = useRef<HTMLButtonElement>(null);
		const ref = useComposedRef(buttonRef, forwardedRef);
		// A string so a new array with the same keys doesn't look like a change.
		const shortcuts =
			shortcut === undefined ? "" : [shortcut].flat().join("\n");

		useIsomorphicLayoutEffect(() => {
			entry.select = onSelect;
		}, [entry, onSelect]);

		useIsomorphicLayoutEffect(() => {
			entry.element = buttonRef.current;
			panel.actions.add(entry);
			return () => {
				panel.actions.delete(entry);
				controller.measure();
			};
		}, [controller, panel, entry]);

		useIsomorphicLayoutEffect(() => {
			entry.commit = commit;
			entry.disabled = disabled;
			entry.shortcuts = shortcuts ? shortcuts.split("\n") : [];
			controller.measure();
		}, [controller, entry, commit, disabled, shortcuts]);

		return (
			<button
				type="button"
				{...props}
				ref={ref}
				disabled={disabled}
				tabIndex={-1}
				data-commit={commit ? "" : undefined}
				style={{
					flex: "1 1 0",
					minWidth: 0,
					overflow: "hidden",
					whiteSpace: "nowrap",
					transition: "flex-grow .2s ease",
					...style,
				}}
				onKeyDown={(event) => {
					onKeyDown?.(event);
					if (event.key === "Escape" && !event.defaultPrevented) {
						event.preventDefault();
						controller.dismiss();
					}
				}}
				onClick={(event) => {
					onClick?.(event);
					if (!event.defaultPrevented) controller.activate(panel, entry);
				}}
			/>
		);
	},
);
