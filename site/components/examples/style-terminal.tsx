"use client";

import { useState } from "react";
import * as Tuckaway from "tuckaway/react";

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
					<Tuckaway.Row key={item} value={item}>
						<Tuckaway.Actions side="start">
							<Tuckaway.Action
								className="bg-green-400 text-black"
								onSelect={() => remove(item)}
								commit
							>
								[done]
							</Tuckaway.Action>
						</Tuckaway.Actions>
						<Tuckaway.Content className="cursor-grab bg-black px-3 py-2 text-left">
							&gt; {item}
						</Tuckaway.Content>
						<Tuckaway.Actions side="end">
							<Tuckaway.Action
								className="bg-green-700 text-black"
								onSelect={() => remove(item)}
								commit
							>
								[rm]
							</Tuckaway.Action>
						</Tuckaway.Actions>
					</Tuckaway.Row>
				))}
			</div>
		</>
	);
}
