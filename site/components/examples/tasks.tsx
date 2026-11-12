"use client";

import { useState } from "react";
import * as Tuckaway from "tuckaway/react";

const todo = ["Water the plants", "Renew passport", "Call the dentist"];

export function Tasks() {
	const [tasks, setTasks] = useState(todo);
	const done = (task: string) =>
		setTasks((list) => list.filter((item) => item !== task));

	return (
		<div className="w-[min(100%,380px)] divide-y divide-neutral-200 overflow-hidden rounded-xl border border-neutral-200 text-sm dark:divide-neutral-800 dark:border-neutral-800">
			{tasks.map((task) => (
				<Tuckaway.Row key={task} value={task}>
					<Tuckaway.Actions side="start" width={90}>
						<Tuckaway.Action
							className="bg-emerald-600 text-[12.5px] font-medium text-white"
							onSelect={() => done(task)}
							commit
						>
							Done
						</Tuckaway.Action>
					</Tuckaway.Actions>
					<Tuckaway.Content className="cursor-grab bg-white px-3.5 py-3 text-left dark:bg-neutral-900">
						{task}
					</Tuckaway.Content>
				</Tuckaway.Row>
			))}
		</div>
	);
}
