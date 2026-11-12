"use client";

import { useState } from "react";
import * as Tuckaway from "tuckaway/react";

const items = ["Design review", "Send invoices", "Book team lunch"];

export function StyleGlass() {
	const [rows, setRows] = useState(items);
	const remove = (item: string) =>
		setRows((list) => list.filter((row) => row !== item));

	return (
		<>
			<div className="absolute inset-0 rounded-xl bg-linear-to-br from-fuchsia-500 via-violet-500 to-sky-400" />
			<div className="relative w-[min(100%,340px)] divide-y divide-white/20 overflow-hidden rounded-3xl border border-white/30 text-sm text-white shadow-xl shadow-black/20 backdrop-blur-xl backdrop-saturate-150">
				{rows.map((item) => (
					<Tuckaway.Row key={item} value={item}>
						<Tuckaway.Actions side="start">
							<Tuckaway.Action
								className="bg-white/30 font-medium"
								onSelect={() => remove(item)}
								commit
							>
								Done
							</Tuckaway.Action>
						</Tuckaway.Actions>
						<Tuckaway.Content className="cursor-grab bg-white/20 px-5 py-3.5 text-left">
							{item}
						</Tuckaway.Content>
						<Tuckaway.Actions side="end">
							<Tuckaway.Action
								className="bg-black/25 font-medium"
								onSelect={() => remove(item)}
								commit
							>
								Delete
							</Tuckaway.Action>
						</Tuckaway.Actions>
					</Tuckaway.Row>
				))}
			</div>
		</>
	);
}
