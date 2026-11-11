"use client";

import { useState } from "react";
import * as Sidle from "sidle/react";
import { ExampleTabs } from "../example-tabs";
import {
	SIDES,
	type SideChoice,
	type VariantKey,
	variantKey,
} from "./actions-code";

const action = "text-[12.5px] font-medium text-white";
const pill =
	"block rounded-md px-2.5 py-1 font-mono text-xs text-neutral-500 transition-colors peer-checked:bg-neutral-200 peer-checked:text-neutral-900 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-1 peer-focus-visible:outline-neutral-400 dark:text-neutral-400 dark:peer-checked:bg-neutral-800 dark:peer-checked:text-neutral-100";

export function ActionsPicker({
	variants,
}: {
	variants: Record<VariantKey, { html: string; code: string }>;
}) {
	const [side, setSide] = useState<SideChoice>("both");
	const [commit, setCommit] = useState(true);
	// A committed row is gone, so bring a new one in for the next try.
	const [round, setRound] = useState(0);
	const again = () => {
		if (commit) setRound((n) => n + 1);
	};

	const view = (
		<>
			<div className="w-[min(100%,380px)] overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
				<Sidle.Row key={`${side}-${commit}-${round}`}>
					{side !== "end" && (
						<Sidle.Actions side="start">
							<Sidle.Action
								className={`${action} bg-emerald-600`}
								onSelect={again}
								commit={commit}
							>
								Archive
							</Sidle.Action>
						</Sidle.Actions>
					)}
					<Sidle.Content className="cursor-grab bg-white px-3.5 py-4 text-left text-[13.5px] font-medium dark:bg-neutral-900">
						Swipe this row
					</Sidle.Content>
					{side !== "start" && (
						<Sidle.Actions side="end">
							<Sidle.Action
								className={`${action} bg-red-500`}
								onSelect={again}
								commit={commit}
							>
								Delete
							</Sidle.Action>
						</Sidle.Actions>
					)}
				</Sidle.Row>
			</div>
			<div className="absolute bottom-4 left-4 flex items-center gap-3">
				<fieldset className="flex gap-1">
					<legend className="sr-only">Side</legend>
					{SIDES.map((value) => (
						<label key={value} className="block cursor-pointer">
							<input
								type="radio"
								name="side"
								value={value}
								checked={side === value}
								onChange={() => setSide(value)}
								className="peer sr-only"
							/>
							<span className={pill}>{value}</span>
						</label>
					))}
				</fieldset>
				<label className="block cursor-pointer">
					<input
						type="checkbox"
						checked={commit}
						onChange={(event) => setCommit(event.target.checked)}
						className="peer sr-only"
					/>
					<span className={pill}>commit</span>
				</label>
			</div>
		</>
	);

	return (
		<ExampleTabs
			view={view}
			reset={false}
			{...variants[variantKey(side, commit)]}
		/>
	);
}
