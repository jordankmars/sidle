"use client";

import { useState } from "react";
import * as Sidle from "sidle/react";

const items = ["review-design", "send --invoices", "book lunch"];

export function StyleTerminal() {
	const [rows, setRows] = useState(items);
	const remove = (item: string) =>
		setRows((list) => list.filter((row) => row !== item));

	return (
		<>
			<div className="absolute inset-0 rounded-xl bg-black" />
			<div className="relative w-[min(100%,340px)] divide-y divide-green-500/60 border border-green-500/60 font-mono text-[13px] text-green-400">
				{rows.map((item) => (
					<Sidle.Row key={item} value={item}>
						<Sidle.Actions side="start">
							<Sidle.Action
								className="bg-green-400 text-black"
								onSelect={() => remove(item)}
								commit
							>
								[done]
							</Sidle.Action>
						</Sidle.Actions>
						<Sidle.Content className="cursor-grab bg-black px-3 py-2 text-left">
							&gt; {item}
						</Sidle.Content>
						<Sidle.Actions side="end">
							<Sidle.Action
								className="bg-green-700 text-black"
								onSelect={() => remove(item)}
								commit
							>
								[rm]
							</Sidle.Action>
						</Sidle.Actions>
					</Sidle.Row>
				))}
			</div>
		</>
	);
}
