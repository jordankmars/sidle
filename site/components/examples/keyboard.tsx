"use client";

import { useState } from "react";
import * as Sidle from "sidle/react";

const inbox = ["Design review", "Send invoices", "Book team lunch"];

const action = "text-[12.5px] font-medium text-white";
const focus =
	"focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-neutral-400";

export function Keyboard() {
	const [rows, setRows] = useState(inbox);
	const [flagged, setFlagged] = useState<string[]>([]);

	const remove = (item: string) =>
		setRows((list) => list.filter((row) => row !== item));
	const flag = (item: string) =>
		setFlagged((list) =>
			list.includes(item) ? list.filter((x) => x !== item) : [...list, item],
		);

	return (
		<div className="w-[min(100%,380px)] divide-y divide-neutral-200 overflow-hidden rounded-xl border border-neutral-200 text-sm dark:divide-neutral-800 dark:border-neutral-800">
			{rows.map((item) => (
				<Sidle.Row key={item} value={item}>
					<Sidle.Content
						className={`${focus} flex items-center justify-between bg-white px-3.5 py-3 text-left dark:bg-neutral-900`}
						aria-label={`${item}. F to flag, Delete to remove.`}
					>
						{item}
						{flagged.includes(item) && (
							<i className="size-[7px] rounded-full bg-amber-500" />
						)}
					</Sidle.Content>
					<Sidle.Actions side="end">
						<Sidle.Action
							className={`${focus} ${action} bg-amber-500`}
							shortcut="f"
							onSelect={() => flag(item)}
						>
							Flag
						</Sidle.Action>
						<Sidle.Action
							className={`${focus} ${action} bg-red-500`}
							shortcut={["Delete", "Backspace"]}
							onSelect={() => remove(item)}
							commit
						>
							Delete
						</Sidle.Action>
					</Sidle.Actions>
				</Sidle.Row>
			))}
		</div>
	);
}
