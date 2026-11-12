"use client";

import { useState } from "react";
import * as Tuckaway from "tuckaway/react";

const chats = ["Design team", "Priya Nair", "Saturday plans"];

const action = "text-[12.5px] font-medium text-white";
const toggle = (list: string[], chat: string) =>
	list.includes(chat) ? list.filter((x) => x !== chat) : [...list, chat];

export function Chats() {
	const [pinned, setPinned] = useState<string[]>([]);
	const [muted, setMuted] = useState<string[]>([]);

	return (
		<div className="w-[min(100%,380px)] divide-y divide-neutral-200 overflow-hidden rounded-xl border border-neutral-200 text-sm dark:divide-neutral-800 dark:border-neutral-800">
			{chats.map((chat) => (
				<Tuckaway.Row key={chat} value={chat}>
					<Tuckaway.Actions side="start">
						<Tuckaway.Action
							className={`${action} bg-sky-600`}
							onSelect={() => setPinned((list) => toggle(list, chat))}
						>
							{pinned.includes(chat) ? "Unpin" : "Pin"}
						</Tuckaway.Action>
					</Tuckaway.Actions>
					<Tuckaway.Content className="flex cursor-grab items-center justify-between bg-white px-3.5 py-3 text-left dark:bg-neutral-900">
						{chat}
						<span className="text-xs text-neutral-500 dark:text-neutral-400">
							{[
								pinned.includes(chat) && "Pinned",
								muted.includes(chat) && "Muted",
							]
								.filter(Boolean)
								.join(" · ")}
						</span>
					</Tuckaway.Content>
					<Tuckaway.Actions side="end">
						<Tuckaway.Action
							className={`${action} bg-neutral-500`}
							onSelect={() => setMuted((list) => toggle(list, chat))}
						>
							{muted.includes(chat) ? "Unmute" : "Mute"}
						</Tuckaway.Action>
					</Tuckaway.Actions>
				</Tuckaway.Row>
			))}
		</div>
	);
}
