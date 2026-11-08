import {
	type KeyboardEvent,
	type PointerEvent,
	StrictMode,
	useEffect,
	useRef,
	useState,
} from "react";
import { createRoot } from "react-dom/client";
import {
	createFrameLoop,
	createSwipeMachine,
	type Point,
	type SwipeMachine,
	type SwipeState,
} from "../src/core";

// Everything the playground needs lives in this file on purpose: it wires the
// core up by hand so we can feel it out before the React adapter exists.

const REDUCED_MOTION = matchMedia("(prefers-reduced-motion: reduce)").matches;

const loop = createFrameLoop({
	request: (cb) => requestAnimationFrame(cb),
	cancel: (handle) => cancelAnimationFrame(handle),
});

interface Mail {
	id: string;
	from: string;
	when: string;
	text: string;
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

const START = { width: 90, commit: true };
const END = { width: 150, commit: true };

function toPoint(e: PointerEvent): Point {
	return { x: e.clientX, y: e.clientY, time: e.timeStamp };
}

function Row({ mail, onRemove }: { mail: Mail; onRemove: () => void }) {
	const rowRef = useRef<HTMLDivElement>(null);
	const bodyRef = useRef<HTMLElement>(null);
	const startRef = useRef<HTMLDivElement>(null);
	const endRef = useRef<HTMLDivElement>(null);
	const machineRef = useRef<SwipeMachine | null>(null);
	const onRemoveRef = useRef(onRemove);
	onRemoveRef.current = onRemove;
	const [flagged, setFlagged] = useState(false);

	useEffect(() => {
		const row = rowRef.current;
		const body = bodyRef.current;
		const start = startRef.current;
		const end = endRef.current;
		if (!row || !body || !start || !end) return;

		function collapse() {
			if (!row) return;
			const animation = row.animate(
				[{ height: `${row.offsetHeight}px` }, { height: "0px" }],
				{
					duration: REDUCED_MOTION ? 1 : 220,
					easing: "cubic-bezier(.3,0,.2,1)",
				},
			);
			animation.onfinish = () => onRemoveRef.current();
		}

		const machine = createSwipeMachine({
			reducedMotion: REDUCED_MOTION,
			onCommit: collapse,
		});
		machineRef.current = machine;

		// Paint straight to the DOM. Re-rendering React every frame would be wasteful.
		function paint({ offset, armedSide }: SwipeState) {
			if (!body || !start || !end) return;
			body.style.transform = offset ? `translateX(${offset}px)` : "";
			start.style.width = `${Math.max(0, offset)}px`;
			end.style.width = `${Math.max(0, -offset)}px`;
			start.classList.toggle("commit", armedSide === "start");
			end.classList.toggle("commit", armedSide === "end");
		}

		const measure = () =>
			machine.setLayout({ rowWidth: row.clientWidth, start: START, end: END });
		measure();
		const resize = new ResizeObserver(measure);
		resize.observe(row);

		const unsubscribe = machine.subscribe((state) => {
			paint(state);
			loop.wake();
		});
		const stopLoop = loop.add(machine);

		return () => {
			resize.disconnect();
			unsubscribe();
			stopLoop();
			machineRef.current = null;
		};
	}, []);

	const machine = () => machineRef.current;

	function flag() {
		setFlagged((f) => !f);
		machine()?.close();
	}

	function onPointerDown(e: PointerEvent<HTMLElement>) {
		if (e.button !== 0) return;
		machine()?.down(toPoint(e));
	}

	function onPointerMove(e: PointerEvent<HTMLElement>) {
		const m = machine();
		if (!m) return;
		m.move(toPoint(e));
		// Once the drag is ours, keep getting events even if the pointer leaves the row.
		if (
			m.getState().phase === "dragging" &&
			!e.currentTarget.hasPointerCapture(e.pointerId)
		) {
			e.currentTarget.setPointerCapture(e.pointerId);
		}
	}

	function onKeyDown(e: KeyboardEvent) {
		const m = machine();
		if (!m) return;
		if (e.key === "Delete" || e.key === "Backspace") {
			e.preventDefault();
			m.commit("end");
		}
		if (e.key === "e") m.commit("start");
		if (e.key === "f") flag();
	}

	return (
		<div ref={rowRef} className={flagged ? "row flagged" : "row"}>
			<div ref={startRef} className="actions start">
				<button
					type="button"
					className="action archive"
					tabIndex={-1}
					onClick={() => machine()?.commit("start")}
				>
					Archive
				</button>
			</div>
			<div ref={endRef} className="actions end">
				<button
					type="button"
					className="action flag"
					tabIndex={-1}
					onClick={flag}
				>
					Flag
				</button>
				<button
					type="button"
					className="action delete"
					tabIndex={-1}
					onClick={() => machine()?.commit("end")}
				>
					Delete
				</button>
			</div>
			<article
				ref={bodyRef}
				className="body"
				// biome-ignore lint/a11y/noNoninteractiveTabindex: rows are focusable so their shortcuts work
				tabIndex={0}
				aria-label={`${mail.from}: ${mail.text}. Delete to remove, E to archive, F to flag.`}
				onPointerDown={onPointerDown}
				onPointerMove={onPointerMove}
				onPointerUp={(e) => machine()?.up(toPoint(e))}
				onPointerCancel={() => machine()?.cancel()}
				onKeyDown={onKeyDown}
			>
				<b>
					<i />
					{mail.from}
				</b>
				<time>{mail.when}</time>
				<span>{mail.text}</span>
			</article>
		</div>
	);
}

function Inbox() {
	const [mails, setMails] = useState(INBOX);
	return (
		<div className="mail">
			{mails.map((mail) => (
				<Row
					key={mail.id}
					mail={mail}
					onRemove={() => setMails((m) => m.filter((x) => x.id !== mail.id))}
				/>
			))}
		</div>
	);
}

function App() {
	const [inbox, setInbox] = useState(0);
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
			<section className="stage">
				<Inbox key={inbox} />
			</section>
			<footer>
				<button
					type="button"
					className="btn"
					onClick={() => setInbox((n) => n + 1)}
				>
					Reset inbox
				</button>
			</footer>
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
header p { margin: 0; color: var(--muted); }
.stage { background: var(--stage); border-radius: 12px; padding: 24px 16px; display: flex; justify-content: center; }
footer { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.btn { font-size: 12.5px; padding: 5px 12px; border-radius: 7px; background: var(--stage); }
.btn:hover { background: var(--line); }

.mail { width: min(100%, 380px); background: var(--surface); border-radius: 12px; overflow: hidden; }
.row { position: relative; overflow: hidden; }
.row + .row .body { border-top: 1px solid var(--line); }
.body {
	position: relative; z-index: 1; background: var(--surface); display: grid; grid-template-columns: 1fr auto;
	column-gap: 10px; padding: 10px 14px; touch-action: pan-y; user-select: none; -webkit-user-select: none; cursor: grab;
}
.body b { font-weight: 500; font-size: 13.5px; display: flex; align-items: center; gap: 6px; }
.body b i { width: 7px; height: 7px; border-radius: 4px; background: var(--warn); display: none; }
.row.flagged .body b i { display: inline-block; }
.body time { font-family: ui-monospace, Menlo, monospace; font-size: 11px; color: var(--muted); }
.body span { grid-column: 1 / -1; color: var(--muted); font-size: 12.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.actions { position: absolute; top: 0; bottom: 0; display: flex; overflow: hidden; width: 0; }
.actions.start { left: 0; }
.actions.end { right: 0; }
.action {
	flex: 1 1 0; min-width: 0; color: #fff; font-weight: 500; font-size: 12.5px; white-space: nowrap;
	overflow: hidden; transition: flex-grow .2s ease;
}
.archive { background: var(--ok); }
.flag { background: var(--warn); }
.delete { background: var(--bad); }
.actions.commit .flag { flex-grow: 0.0001; }
`;

const root = document.getElementById("root");
if (root) {
	createRoot(root).render(
		<StrictMode>
			<App />
		</StrictMode>,
	);
}
