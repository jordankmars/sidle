"use client";

import { useState } from "react";
import * as Tuckaway from "tuckaway/react";

const inbox = [
	{ id: "1", from: "Priya Nair", text: "Pushed the fix, can you take a look?" },
	{ id: "2", from: "Northwind", text: "Your invoice #2291 has been paid." },
	{ id: "3", from: "Sam Ortega", text: "Photos from Saturday are up." },
	{ id: "4", from: "Linear", text: "3 issues were assigned to you." },
];

const action = "text-[12.5px] font-medium text-white";

export function Inbox() {
	const [mails, setMails] = useState(inbox);
	const [flagged, setFlagged] = useState<string[]>([]);

	const remove = (id: string) =>
		setMails((list) => list.filter((mail) => mail.id !== id));
	const flag = (id: string) =>
		setFlagged((ids) =>
			ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id],
		);

	return (
		<div className="w-[min(100%,380px)] divide-y divide-neutral-200 overflow-hidden rounded-xl border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
			{mails.map((mail) => (
				<Tuckaway.Row key={mail.id} value={mail.id}>
					<Tuckaway.Actions side="start">
						<Tuckaway.Action
							className={`${action} bg-emerald-600`}
							onSelect={() => remove(mail.id)}
							commit
						>
							Archive
						</Tuckaway.Action>
					</Tuckaway.Actions>
					<Tuckaway.Content className="cursor-grab bg-white px-3.5 py-2.5 text-left dark:bg-neutral-900">
						<b className="flex items-center gap-1.5 text-[13.5px] font-medium">
							{flagged.includes(mail.id) && (
								<i className="size-[7px] rounded-full bg-amber-500" />
							)}
							{mail.from}
						</b>
						<p className="truncate text-[12.5px] text-neutral-500 dark:text-neutral-400">
							{mail.text}
						</p>
					</Tuckaway.Content>
					<Tuckaway.Actions side="end">
						<Tuckaway.Action
							className={`${action} bg-amber-500`}
							onSelect={() => flag(mail.id)}
						>
							Flag
						</Tuckaway.Action>
						<Tuckaway.Action
							className={`${action} bg-red-500`}
							onSelect={() => remove(mail.id)}
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
