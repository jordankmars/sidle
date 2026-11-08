import {
	createContext,
	type ForwardedRef,
	useCallback,
	useContext,
	useEffect,
	useLayoutEffect,
} from "react";
import type { PanelEntry, RowController } from "./controller";

export const RowContext = createContext<RowController | null>(null);

export function useRowController(part: string): RowController {
	const controller = useContext(RowContext);
	if (!controller) throw new Error(`Sidle.${part} must be inside a Sidle.Row.`);
	return controller;
}

export const PanelContext = createContext<PanelEntry | null>(null);

export function usePanel(): PanelEntry {
	const panel = useContext(PanelContext);
	if (!panel) throw new Error("Sidle.Action must be inside a Sidle.Actions.");
	return panel;
}

/** `useLayoutEffect` without the warning React 18 prints on the server. */
export const useIsomorphicLayoutEffect =
	typeof document === "undefined" ? useEffect : useLayoutEffect;

/** A ref callback that fills our own ref and the one the user passed. */
export function useComposedRef<T>(
	own: { current: T | null },
	forwarded: ForwardedRef<T>,
) {
	return useCallback(
		(value: T | null) => {
			own.current = value;
			if (typeof forwarded === "function") forwarded(value);
			else if (forwarded) forwarded.current = value;
		},
		[own, forwarded],
	);
}
