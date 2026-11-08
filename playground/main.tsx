import { StrictMode, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import * as Sidle from "../src/react";

// The demo for the React adapter, kept in one file on purpose. Everything here
// is what a real app would write, with the swiping left to `sidle/react`.

interface Mail {
	id: string;
	from: string;
	when: string;
	text: string;
	flagged?: boolean;
}

const INBOX: Mail[] = [
	{
		id: "1",
		from: "Priya Nair",
		when: "9:12",
		text: "Drawer snap points: pushed the fix, can you look before standup?",
	},
	{
		id: "2",
		from: "Northwind Billing",
		when: "8:40",
		text: "Your invoice #2291 has been paid in full.",
	},
	{
		id: "3",
		from: "Sam Ortega",
		when: "Tue",
		text: "Photos from Saturday are in the shared album.",
	},
	{
		id: "4",
		from: "Linear",
		when: "Mon",
		text: "3 issues were assigned to you this week.",
	},
];

// A long list for the windowed demo, built by cycling through the inbox.
const MANY: Mail[] = Array.from({ length: 200 }, (_, i) => ({
	...INBOX[i % INBOX.length],
	id: `many-${i}`,
	from: `${INBOX[i % INBOX.length].from} #${i + 1}`,
}));

function Row({
	mail,
	dir,
	onFlag,
	onRemove,
	onOpen,
}: {
	mail: Mail;
	dir: Sidle.Direction;
	onFlag: () => void;
	onRemove: () => void;
	onOpen: () => void;
}) {
	return (
		<Sidle.Row
			value={mail.id}
			dir={dir}
			className={mail.flagged ? "row flagged" : "row"}
		>
			<Sidle.Actions side="start" width={90}>
				<Sidle.Action
					className="action archive"
					shortcut="e"
					onSelect={onRemove}
					commit
				>
					Archive
				</Sidle.Action>
			</Sidle.Actions>
			<Sidle.Content
				className="body"
				aria-label={`${mail.from}: ${mail.text}. Delete to remove, E to archive, F to flag.`}
				onClick={onOpen}
			>
				<b>
					<i />
					{mail.from}
				</b>
				<time>{mail.when}</time>
				<span>{mail.text}</span>
			</Sidle.Content>
			<Sidle.Actions side="end" width={150}>
				<Sidle.Action className="action flag" shortcut="f" onSelect={onFlag}>
					Flag
				</Sidle.Action>
				<Sidle.Action
					className="action delete"
					shortcut={["Delete", "Backspace"]}
					onSelect={onRemove}
					commit
				>
					Delete
				</Sidle.Action>
			</Sidle.Actions>
		</Sidle.Row>
	);
}

function useMailList(initial: Mail[]) {
	const [mails, setMails] = useState(initial);
	return {
		mails,
		remove: (id: string) => setMails((m) => m.filter((x) => x.id !== id)),
		toggleFlag: (id: string) =>
			setMails((m) =>
				m.map((x) => (x.id === id ? { ...x, flagged: !x.flagged } : x)),
			),
	};
}

function Inbox({
	dir,
	onOpen,
}: {
	dir: Sidle.Direction;
	onOpen: (from: string) => void;
}) {
	const { mails, remove, toggleFlag } = useMailList(INBOX);

	return (
		<div className="mail">
			<Sidle.Group>
				{mails.map((mail) => (
					<Row
						key={mail.id}
						mail={mail}
						dir={dir}
						onFlag={() => toggleFlag(mail.id)}
						onRemove={() => remove(mail.id)}
						onOpen={() => onOpen(mail.from)}
					/>
				))}
			</Sidle.Group>
		</div>
	);
}

const ROW_HEIGHT = 60;
const OVERSCAN = 3;

/**
 * A hand-rolled windowed list: only the rows in view are mounted. Open a row,
 * scroll it away and back, and it should still be open.
 */
function WindowedList({
	dir,
	onOpen,
}: {
	dir: Sidle.Direction;
	onOpen: (from: string) => void;
}) {
	const { mails, remove, toggleFlag } = useMailList(MANY);
	const listRef = useRef<HTMLDivElement>(null);
	const [scrollTop, setScrollTop] = useState(0);
	const [height, setHeight] = useState(320);

	useEffect(() => {
		const list = listRef.current;
		if (!list) return;
		const resize = new ResizeObserver(() => setHeight(list.clientHeight));
		resize.observe(list);
		return () => resize.disconnect();
	}, []);

	const first = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
	const last = Math.min(
		mails.length,
		Math.ceil((scrollTop + height) / ROW_HEIGHT) + OVERSCAN,
	);

	return (
		<div
			ref={listRef}
			className="mail windowed"
			onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
		>
			<div style={{ height: first * ROW_HEIGHT }} />
			<Sidle.Group>
				{mails.slice(first, last).map((mail) => (
					<Row
						key={mail.id}
						mail={mail}
						dir={dir}
						onFlag={() => toggleFlag(mail.id)}
						onRemove={() => remove(mail.id)}
						onOpen={() => onOpen(mail.from)}
					/>
				))}
			</Sidle.Group>
			<div style={{ height: (mails.length - last) * ROW_HEIGHT }} />
		</div>
	);
}

function App() {
	const [inbox, setInbox] = useState(0);
	const [dir, setDir] = useState<Sidle.Direction>("ltr");
	const [opened, setOpened] = useState<string | null>(null);
	return (
		<main>
			<style>{CSS}</style>
			<header>
				<h1>sidle playground</h1>
				<p>
					Swipe a row left or right to reveal its actions. Swipe all the way to
					commit. Vertical drags still scroll.
				</p>
			</header>
			<section className="stage" dir={dir}>
				<Inbox key={inbox} dir={dir} onOpen={setOpened} />
			</section>
			<footer>
				<button
					type="button"
					className="btn"
					onClick={() => setInbox((n) => n + 1)}
				>
					Reset inbox
				</button>
				<button
					type="button"
					className="btn"
					aria-pressed={dir === "rtl"}
					onClick={() => setDir((d) => (d === "ltr" ? "rtl" : "ltr"))}
				>
					{dir === "ltr" ? "Left to right" : "Right to left"}
				</button>
				<output className="opened">
					{opened ? `Opened ${opened}` : "Tap a row to open it"}
				</output>
			</footer>
			<header>
				<h2>Windowed list</h2>
				<p>
					200 rows, only the visible ones mounted. Open a row, scroll it out of
					view and back, and it is still open.
				</p>
			</header>
			<section className="stage" dir={dir}>
				<WindowedList key={inbox} dir={dir} onOpen={setOpened} />
			</section>
		</main>
	);
}

const CSS = `
:root {
	--bg: #f6f6f8; --surface: #fff; --stage: #ececf0; --fg: #16161a; --muted: #6a6a75;
	--line: #e2e2e8; --accent: #2d55e0; --ok: #1f9d55; --warn: #e8890c; --bad: #e5484d;
	color-scheme: light;
}
@media (prefers-color-scheme: dark) {
	:root {
		--bg: #0e0e11; --surface: #1a1a1f; --stage: #121216; --fg: #ececf1; --muted: #9b9ba8;
		--line: #2a2a31; --accent: #7390ff; color-scheme: dark;
	}
}
* { box-sizing: border-box; }
body {
	margin: 0; background: var(--bg); color: var(--fg); font: 14px/1.5 ui-sans-serif, system-ui, -apple-system, sans-serif;
	-webkit-font-smoothing: antialiased;
}
button { font: inherit; color: inherit; background: none; border: 0; padding: 0; cursor: pointer; }
:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }
main { max-width: 480px; margin: 0 auto; padding: 40px 16px 64px; display: grid; gap: 16px; }
header { display: grid; gap: 6px; }
h1 { margin: 0; font-size: 24px; font-weight: 600; letter-spacing: -0.02em; }
h2 { margin: 16px 0 0; font-size: 16px; font-weight: 600; letter-spacing: -0.01em; }
header p { margin: 0; color: var(--muted); }
.stage { background: var(--stage); border-radius: 12px; padding: 24px 16px; display: flex; justify-content: center; }
footer { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.btn { font-size: 12.5px; padding: 5px 12px; border-radius: 7px; background: var(--stage); }
.btn:hover { background: var(--line); }
.opened { font-size: 12.5px; color: var(--muted); }

.mail { width: min(100%, 380px); background: var(--surface); border-radius: 12px; overflow: hidden; }
.row + .row .body { border-top: 1px solid var(--line); }
.body {
	background: var(--surface); display: grid; grid-template-columns: 1fr auto;
	column-gap: 10px; padding: 10px 14px; cursor: grab;
}
.body b { font-weight: 500; font-size: 13.5px; display: flex; align-items: center; gap: 6px; }
.body b i { width: 7px; height: 7px; border-radius: 4px; background: var(--warn); display: none; }
.row.flagged .body b i { display: inline-block; }
.body time { font-family: ui-monospace, Menlo, monospace; font-size: 11px; color: var(--muted); }
.body span { grid-column: 1 / -1; color: var(--muted); font-size: 12.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.windowed { height: 320px; overflow-y: auto; overscroll-behavior: contain; }
.windowed .body { height: ${ROW_HEIGHT}px; }
.action { color: #fff; font-weight: 500; font-size: 12.5px; }
.archive { background: var(--ok); }
.flag { background: var(--warn); }
.delete { background: var(--bad); }
`;

const root = document.getElementById("root");
if (root) {
	createRoot(root).render(
		<StrictMode>
			<App />
		</StrictMode>,
	);
}
