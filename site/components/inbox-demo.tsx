"use client";

import { useState } from "react";
import * as Tuckaway from "tuckaway/react";

// The playground's inbox (playground/main.tsx), with the same mail, sizes and
// actions, in the site's neutral palette so it follows the theme toggle.

interface Mail {
	id: string;
	from: string;
	when: string;
	text: string;
	flagged?: boolean;
}

const INBOX: Mail[] = [
	{
		id: "1",
		from: "Priya Nair",
		when: "9:12",
		text: "Drawer snap points: pushed the fix, can you look before standup?",
	},
	{
		id: "2",
		from: "Northwind Billing",
		when: "8:40",
		text: "Your invoice #2291 has been paid in full.",
	},
	{
		id: "3",
		from: "Sam Ortega",
		when: "Tue",
		text: "Photos from Saturday are in the shared album.",
	},
	{
		id: "4",
		from: "Linear",
		when: "Mon",
		text: "3 issues were assigned to you this week.",
	},
];

const focus =
	"focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-neutral-400";
const action = `${focus} cursor-pointer text-[12.5px] font-medium text-white`;

function Row({
	mail,
	first,
	onFlag,
	onRemove,
}: {
	mail: Mail;
	first: boolean;
	onFlag: () => void;
	onRemove: () => void;
}) {
	return (
		<Tuckaway.Row value={mail.id}>
			<Tuckaway.Actions side="start" width={90}>
				<Tuckaway.Action
					className={`${action} bg-emerald-600`}
					shortcut="e"
					onSelect={onRemove}
					commit
				>
					Archive
				</Tuckaway.Action>
			</Tuckaway.Actions>
			<Tuckaway.Content
				className={`${focus} grid cursor-grab grid-cols-[1fr_auto] gap-x-2.5 bg-white px-3.5 py-2.5 text-left dark:bg-neutral-900 ${
					first ? "" : "border-t border-neutral-200 dark:border-neutral-800"
				}`}
				aria-label={`${mail.from}: ${mail.text}. Delete to remove, E to archive, F to flag.`}
			>
				<b className="flex items-center gap-1.5 text-[13.5px] font-medium">
					{mail.flagged && (
						<i className="inline-block size-[7px] rounded-full bg-amber-500" />
					)}
					{mail.from}
				</b>
				<time className="font-mono text-[11px] text-neutral-500 dark:text-neutral-400">
					{mail.when}
				</time>
				<span className="col-span-full truncate text-[12.5px] text-neutral-500 dark:text-neutral-400">
					{mail.text}
				</span>
			</Tuckaway.Content>
			<Tuckaway.Actions side="end" width={150}>
				<Tuckaway.Action
					className={`${action} bg-amber-500`}
					shortcut="f"
					onSelect={onFlag}
				>
					Flag
				</Tuckaway.Action>
				<Tuckaway.Action
					className={`${action} bg-red-500`}
					shortcut={["Delete", "Backspace"]}
					onSelect={onRemove}
					commit
				>
					Delete
				</Tuckaway.Action>
			</Tuckaway.Actions>
		</Tuckaway.Row>
	);
}

export function InboxDemo() {
	const [mails, setMails] = useState(INBOX);
	// Bumped on reset, so every row mounts fresh, as the playground does.
	const [round, setRound] = useState(0);

	const remove = (id: string) => setMails((m) => m.filter((x) => x.id !== id));
	const toggleFlag = (id: string) =>
		setMails((m) =>
			m.map((x) => (x.id === id ? { ...x, flagged: !x.flagged } : x)),
		);

	return (
		<div className="flex w-full flex-col items-center">
			<div
				key={round}
				className="w-[min(100%,380px)] overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800"
			>
				<Tuckaway.Group>
					{mails.map((mail, i) => (
						<Row
							key={mail.id}
							mail={mail}
							first={i === 0}
							onFlag={() => toggleFlag(mail.id)}
							onRemove={() => remove(mail.id)}
						/>
					))}
				</Tuckaway.Group>
			</div>
			{/* Hidden rather than unmounted, so the page doesn't shift. */}
			<button
				type="button"
				className={`mt-3 cursor-pointer rounded-md px-2 py-1 text-[12.5px] text-neutral-500 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 ${focus} ${
					mails !== INBOX ? "" : "invisible"
				}`}
				onClick={() => {
					setMails(INBOX);
					setRound((n) => n + 1);
				}}
			>
				Reset inbox
			</button>
		</div>
	);
}
