"use client";

import * as Tuckaway from "tuckaway/react";

const lists = [
	{ title: "Today", rows: ["Stand-up", "Lunch"] },
	{ title: "Tomorrow", rows: ["Dentist", "Gym"] },
];

export function Groups() {
	return (
		<div className="grid w-full max-w-lg gap-4 text-sm sm:grid-cols-2">
			{lists.map((list) => (
				<div key={list.title}>
					<p className="mb-1.5 text-xs font-medium text-neutral-500 dark:text-neutral-400">
						{list.title}
					</p>
					<div className="divide-y divide-neutral-200 overflow-hidden rounded-xl border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
						<Tuckaway.Group>
							{list.rows.map((row) => (
								<Tuckaway.Row key={row} value={row}>
									<Tuckaway.Content className="cursor-grab bg-white px-3.5 py-3 text-left dark:bg-neutral-900">
										{row}
									</Tuckaway.Content>
									<Tuckaway.Actions side="end">
										<Tuckaway.Action
											className="bg-amber-500 text-[12.5px] font-medium text-white"
											onSelect={() => {}}
										>
											Move
										</Tuckaway.Action>
									</Tuckaway.Actions>
								</Tuckaway.Row>
							))}
						</Tuckaway.Group>
					</div>
				</div>
			))}
		</div>
	);
}
