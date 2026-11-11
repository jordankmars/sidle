import { highlight } from "@/lib/highlight";
import {
	actionsCode,
	SIDES,
	type VariantKey,
	variantKey,
} from "./examples/actions-code";
import { ActionsPicker } from "./examples/actions-picker";

/** Highlights every variant at build time, so the picker can swap between them. */
export async function ActionsExample() {
	const entries = await Promise.all(
		SIDES.flatMap((side) =>
			[true, false].map(async (commit) => {
				const code = actionsCode(side, commit);
				return [
					variantKey(side, commit),
					{ html: await highlight(code), code },
				] as const;
			}),
		),
	);
	return (
		<ActionsPicker
			variants={
				Object.fromEntries(entries) as Record<
					VariantKey,
					{ html: string; code: string }
				>
			}
		/>
	);
}
