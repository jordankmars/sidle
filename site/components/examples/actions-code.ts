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
		? `			<Tuckaway.Actions side="${side}">
				<Tuckaway.Action onSelect={${handler}} commit>
					${label}
				</Tuckaway.Action>
			</Tuckaway.Actions>`
		: `			<Tuckaway.Actions side="${side}">
				<Tuckaway.Action onSelect={${handler}}>${label}</Tuckaway.Action>
			</Tuckaway.Actions>`;

export const actionsCode = (side: SideChoice, commit: boolean) =>
	[
		`import * as Tuckaway from "tuckaway/react";

export function Example({ archive, remove }) {
	return (
		<Tuckaway.Row>`,
		side !== "end" && panel("start", "Archive", "archive", commit),
		"			<Tuckaway.Content>Swipe this row</Tuckaway.Content>",
		side !== "start" && panel("end", "Delete", "remove", commit),
		`		</Tuckaway.Row>
	);
}`,
	]
		.filter(Boolean)
		.join("\n");
