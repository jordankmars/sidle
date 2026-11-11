"use client";

import { useState } from "react";
import * as Sidle from "sidle/react";

const inbox = ["رسالة جديدة", "فاتورة مدفوعة", "صور يوم السبت"];

const action = "text-[12.5px] font-medium text-white";

export function Rtl() {
	const [mails, setMails] = useState(inbox);
	const remove = (mail: string) =>
		setMails((list) => list.filter((item) => item !== mail));

	return (
		<div
			dir="rtl"
			className="w-[min(100%,380px)] divide-y divide-neutral-200 overflow-hidden rounded-xl border border-neutral-200 text-sm dark:divide-neutral-800 dark:border-neutral-800"
		>
			{mails.map((mail) => (
				<Sidle.Row key={mail} value={mail}>
					<Sidle.Actions side="start">
						<Sidle.Action
							className={`${action} bg-emerald-600`}
							onSelect={() => remove(mail)}
							commit
						>
							أرشفة
						</Sidle.Action>
					</Sidle.Actions>
					<Sidle.Content className="cursor-grab bg-white px-3.5 py-3 text-start dark:bg-neutral-900">
						{mail}
					</Sidle.Content>
					<Sidle.Actions side="end">
						<Sidle.Action
							className={`${action} bg-red-500`}
							onSelect={() => remove(mail)}
							commit
						>
							حذف
						</Sidle.Action>
					</Sidle.Actions>
				</Sidle.Row>
			))}
		</div>
	);
}
