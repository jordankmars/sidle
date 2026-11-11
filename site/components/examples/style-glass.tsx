"use client";

import { useState } from "react";
import * as Sidle from "sidle/react";

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
					<Sidle.Row key={item} value={item}>
						<Sidle.Actions side="start">
							<Sidle.Action
								className="bg-white/30 font-medium"
								onSelect={() => remove(item)}
								commit
							>
								Done
							</Sidle.Action>
						</Sidle.Actions>
						<Sidle.Content className="cursor-grab bg-white/20 px-5 py-3.5 text-left">
							{item}
						</Sidle.Content>
						<Sidle.Actions side="end">
							<Sidle.Action
								className="bg-black/25 font-medium"
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
