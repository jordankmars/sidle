"use client";

import { useState } from "react";
import * as Sidle from "sidle/react";

const items = ["Design review", "Send invoices", "Book team lunch"];

export function StyleSoft() {
	const [rows, setRows] = useState(items);
	const remove = (item: string) =>
		setRows((list) => list.filter((row) => row !== item));

	return (
		<>
			<div className="absolute inset-0 rounded-xl bg-indigo-50" />
			<div className="relative grid w-[min(100%,340px)] gap-3 text-sm text-slate-700">
				{rows.map((item) => (
					<Sidle.Row
						key={item}
						value={item}
						className="rounded-[22px] shadow-[0_12px_32px_rgba(15,23,42,0.12)]"
					>
						<Sidle.Actions side="start">
							<Sidle.Action
								className="bg-emerald-100 font-medium text-emerald-700"
								onSelect={() => remove(item)}
								commit
							>
								Done
							</Sidle.Action>
						</Sidle.Actions>
						<Sidle.Content className="cursor-grab bg-white px-5 py-4 text-left">
							{item}
						</Sidle.Content>
						<Sidle.Actions side="end">
							<Sidle.Action
								className="bg-rose-100 font-medium text-rose-700"
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
