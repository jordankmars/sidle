"use client";

import { useState } from "react";
import * as Sidle from "sidle/react";

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
					<Sidle.Row key={item} value={item}>
						<Sidle.Actions side="start">
							<Sidle.Action
								className="bg-cyan-300 text-xs font-black uppercase"
								onSelect={() => remove(item)}
								commit
							>
								Done
							</Sidle.Action>
						</Sidle.Actions>
						<Sidle.Content className="cursor-grab bg-white px-3 py-3 text-left">
							{item}
						</Sidle.Content>
						<Sidle.Actions side="end">
							<Sidle.Action
								className="bg-pink-400 text-xs font-black uppercase"
								onSelect={() => remove(item)}
								commit
							>
								Delete
							</Sidle.Action>
						</Sidle.Actions>
					</Sidle.Row>
				))}
			</div>
		</>
	);
}
