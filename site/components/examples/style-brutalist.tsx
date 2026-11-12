"use client";

import { useState } from "react";
import * as Tuckaway from "tuckaway/react";

const items = ["Design review", "Send invoices", "Book team lunch"];

export function StyleBrutalist() {
	const [rows, setRows] = useState(items);
	const remove = (item: string) =>
		setRows((list) => list.filter((row) => row !== item));

	return (
		<>
			<div className="absolute inset-0 rounded-xl bg-amber-100" />
			<div className="relative w-[min(100%,340px)] divide-y-[3px] divide-black border-[3px] border-black text-sm font-bold text-black shadow-[8px_8px_0_#000]">
				{rows.map((item) => (
					<Tuckaway.Row key={item} value={item}>
						<Tuckaway.Actions side="start">
							<Tuckaway.Action
								className="bg-cyan-300 text-xs font-black uppercase"
								onSelect={() => remove(item)}
								commit
							>
								Done
							</Tuckaway.Action>
						</Tuckaway.Actions>
						<Tuckaway.Content className="cursor-grab bg-white px-3 py-3 text-left">
							{item}
						</Tuckaway.Content>
						<Tuckaway.Actions side="end">
							<Tuckaway.Action
								className="bg-pink-400 text-xs font-black uppercase"
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
