"use client";

import { useState } from "react";
import * as Tuckaway from "tuckaway/react";

const items = ["Design review", "Send invoices", "Book team lunch"];

export function StyleSite() {
	const [rows, setRows] = useState(items);
	const remove = (item: string) =>
		setRows((list) => list.filter((row) => row !== item));

	return (
		<div className="w-[min(100%,340px)] divide-y divide-neutral-700 overflow-hidden rounded-2xl text-sm dark:divide-neutral-300">
			{rows.map((item) => (
				<Tuckaway.Row key={item} value={item}>
					<Tuckaway.Actions side="start">
						<Tuckaway.Action
							className="bg-neutral-700 font-medium text-neutral-50 dark:bg-neutral-300 dark:text-neutral-900"
							onSelect={() => remove(item)}
							commit
						>
							Done
						</Tuckaway.Action>
					</Tuckaway.Actions>
					<Tuckaway.Content className="cursor-grab px-4 py-3 text-left bg-neutral-900 text-neutral-50 dark:bg-neutral-100 dark:text-neutral-900">
						{item}
					</Tuckaway.Content>
					<Tuckaway.Actions side="end">
						<Tuckaway.Action
							className="bg-neutral-600 font-medium text-neutral-50 dark:bg-neutral-400 dark:text-neutral-900"
							onSelect={() => remove(item)}
							commit
						>
							Delete
						</Tuckaway.Action>
					</Tuckaway.Actions>
				</Tuckaway.Row>
			))}
		</div>
	);
}
