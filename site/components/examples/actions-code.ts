export const SIDES = ["start", "end", "both"] as const;
export type SideChoice = (typeof SIDES)[number];
export type VariantKey = `${SideChoice}-${"commit" | "plain"}`;

export const variantKey = (side: SideChoice, commit: boolean): VariantKey =>
	`${side}-${commit ? "commit" : "plain"}`;

const panel = (
	side: string,
	label: string,
	handler: string,
	commit: boolean,
) =>
	commit
		? `			<Sidle.Actions side="${side}">
				<Sidle.Action onSelect={${handler}} commit>
					${label}
				</Sidle.Action>
			</Sidle.Actions>`
		: `			<Sidle.Actions side="${side}">
				<Sidle.Action onSelect={${handler}}>${label}</Sidle.Action>
			</Sidle.Actions>`;

export const actionsCode = (side: SideChoice, commit: boolean) =>
	[
		`import * as Sidle from "sidle/react";

export function Example({ archive, remove }) {
	return (
		<Sidle.Row>`,
		side !== "end" && panel("start", "Archive", "archive", commit),
		"			<Sidle.Content>Swipe this row</Sidle.Content>",
		side !== "start" && panel("end", "Delete", "remove", commit),
		`		</Sidle.Row>
	);
}`,
	]
		.filter(Boolean)
		.join("\n");
