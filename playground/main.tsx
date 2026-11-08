import {
	type KeyboardEvent,
	type PointerEvent,
	type RefObject,
	StrictMode,
	useEffect,
	useRef,
	useState,
} from "react";
import { createRoot } from "react-dom/client";
import {
	createFrameLoop,
	createSwipeGroup,
	createSwipeMachine,
	type Direction,
	type Point,
	type SwipeGroup,
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

const START = { width: 90, commit: true };
const END = { width: 150, commit: true };

function toPoint(e: PointerEvent): Point {
	return { x: e.clientX, y: e.clientY, time: e.timeStamp, id: e.pointerId };
}

function Row({
	mail,
	group,
	dir,
	onFlag,
	onRemove,
	onOpen,
}: {
	mail: Mail;
	group: SwipeGroup;
	dir: Direction;
	onFlag: () => void;
	onRemove: () => void;
	onOpen: () => void;
}) {
	const rowRef = useRef<HTMLDivElement>(null);
	const bodyRef = useRef<HTMLElement>(null);
	const startRef = useRef<HTMLDivElement>(null);
	const endRef = useRef<HTMLDivElement>(null);
	const machineRef = useRef<SwipeMachine | null>(null);
	const measureRef = useRef<() => void>(null);
	const swipedRef = useRef(false);
	const onRemoveRef = useRef(onRemove);
	onRemoveRef.current = onRemove;
	const dirRef = useRef(dir);
	dirRef.current = dir;

	useEffect(() => {
		const row = rowRef.current;
		const body = bodyRef.current;
		const start = startRef.current;
		const end = endRef.current;
		if (!row || !body || !start || !end) return;

		function collapse() {
			// A row destroyed mid-commit (scrolled away, say) is already gone.
			if (!row?.isConnected) return onRemoveRef.current();
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
			// Leave the leading screen edge to iOS swipe-back.
			edgeGuard: 24,
			onCommit: collapse,
		});
		machineRef.current = machine;

		// Paint straight to the DOM. Re-rendering React every frame would be wasteful.
		function paint({ offset, armedSide }: SwipeState) {
			if (!body || !start || !end) return;
			// Offsets are physical px, so flip them to find which side is showing.
			const startward = dirRef.current === "rtl" ? -offset : offset;
			body.style.transform = offset ? `translateX(${offset}px)` : "";
			start.style.width = `${Math.max(0, startward)}px`;
			end.style.width = `${Math.max(0, -startward)}px`;
			start.classList.toggle("commit", armedSide === "start");
			end.classList.toggle("commit", armedSide === "end");
		}

		const measure = () =>
			machine.setLayout({
				rowWidth: row.clientWidth,
				dir: dirRef.current,
				viewportWidth: window.innerWidth,
				start: START,
				end: END,
			});
		measure();
		measureRef.current = measure;
		const resize = new ResizeObserver(measure);
		resize.observe(row);

		const unsubscribe = machine.subscribe((state) => {
			paint(state);
			loop.wake();
		});
		const stopLoop = loop.add(machine);
		const leaveGroup = group.register(mail.id, machine);

		return () => {
			// Settle first so a commit in flight still lands and the group sees the final state.
			machine.destroy();
			leaveGroup();
			resize.disconnect();
			unsubscribe();
			stopLoop();
			machineRef.current = null;
			measureRef.current = null;
		};
	}, [group, mail.id]);

	// Direction isn't something a ResizeObserver sees, so re-measure when it flips.
	useEffect(() => {
		if (dir) measureRef.current?.();
	}, [dir]);

	const machine = () => machineRef.current;

	function flag() {
		onFlag();
		machine()?.close();
	}

	function onPointerDown(e: PointerEvent<HTMLElement>) {
		if (e.button !== 0) return;
		machine()?.down(toPoint(e));
	}

	function onPointerMove(e: PointerEvent<HTMLElement>) {
		const m = machine();
		if (!m) return;
		const wasDragging = m.getState().phase === "dragging";
		m.move(toPoint(e));
		// Once the drag is ours, keep getting events even if the pointer leaves the row.
		if (!wasDragging && m.getState().phase === "dragging") {
			e.currentTarget.setPointerCapture(e.pointerId);
		}
	}

	function onClick() {
		// The click that follows a swipe isn't a tap on the row.
		if (!swipedRef.current) onOpen();
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
		if (e.key === "Enter") onOpen();
	}

	return (
		<div ref={rowRef} className={mail.flagged ? "row flagged" : "row"}>
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
				onPointerUp={(e) => {
					swipedRef.current = machine()?.up(toPoint(e)) ?? false;
				}}
				onPointerCancel={() => machine()?.cancel()}
				onClick={onClick}
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

/** One open row per list, and a tap anywhere outside the list closes it. */
function useSwipeGroup(listRef: RefObject<HTMLElement | null>) {
	const [group] = useState(createSwipeGroup);
	useEffect(() => {
		function onPointerDown(e: globalThis.PointerEvent) {
			if (!listRef.current?.contains(e.target as Node)) group.closeAll();
		}
		document.addEventListener("pointerdown", onPointerDown);
		return () => document.removeEventListener("pointerdown", onPointerDown);
	}, [group, listRef]);
	return group;
}

function Inbox({
	dir,
	onOpen,
}: {
	dir: Direction;
	onOpen: (from: string) => void;
}) {
	const { mails, remove, toggleFlag } = useMailList(INBOX);
	const listRef = useRef<HTMLDivElement>(null);
	const group = useSwipeGroup(listRef);

	return (
		<div ref={listRef} className="mail">
			{mails.map((mail) => (
				<Row
					key={mail.id}
					mail={mail}
					group={group}
					dir={dir}
					onFlag={() => toggleFlag(mail.id)}
					onRemove={() => remove(mail.id)}
					onOpen={() => onOpen(mail.from)}
				/>
			))}
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
	dir: Direction;
	onOpen: (from: string) => void;
}) {
	const { mails, remove, toggleFlag } = useMailList(MANY);
	const listRef = useRef<HTMLDivElement>(null);
	const group = useSwipeGroup(listRef);
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
			{mails.slice(first, last).map((mail) => (
				<Row
					key={mail.id}
					mail={mail}
					group={group}
					dir={dir}
					onFlag={() => toggleFlag(mail.id)}
					onRemove={() => remove(mail.id)}
					onOpen={() => onOpen(mail.from)}
				/>
			))}
			<div style={{ height: (mails.length - last) * ROW_HEIGHT }} />
		</div>
	);
}

function App() {
	const [inbox, setInbox] = useState(0);
	const [dir, setDir] = useState<Direction>("ltr");
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
.windowed { height: 320px; overflow-y: auto; overscroll-behavior: contain; }
.windowed .body { height: ${ROW_HEIGHT}px; }
.actions { position: absolute; top: 0; bottom: 0; display: flex; overflow: hidden; width: 0; }
.actions.start { inset-inline-start: 0; }
.actions.end { inset-inline-end: 0; }
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
