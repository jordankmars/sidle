"use client";

import { useState } from "react";
import * as Tuckaway from "tuckaway/react";

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
				<Tuckaway.Row key={mail} value={mail}>
					<Tuckaway.Actions side="start">
						<Tuckaway.Action
							className={`${action} bg-emerald-600`}
							onSelect={() => remove(mail)}
							commit
						>
							أرشفة
						</Tuckaway.Action>
					</Tuckaway.Actions>
					<Tuckaway.Content className="cursor-grab bg-white px-3.5 py-3 text-start dark:bg-neutral-900">
						{mail}
					</Tuckaway.Content>
					<Tuckaway.Actions side="end">
						<Tuckaway.Action
							className={`${action} bg-red-500`}
							onSelect={() => remove(mail)}
							commit
						>
							حذف
						</Tuckaway.Action>
					</Tuckaway.Actions>
				</Tuckaway.Row>
			))}
		</div>
	);
}
