import { describe, expect, it } from "vitest";
import { createSwipeMachine, type SwipeMachine } from "./machine";

const W = 380;
const layout = {
	rowWidth: W,
	start: { width: 90 },
	end: { width: 150 },
};
const committable = {
	rowWidth: W,
	start: { width: 90, commit: true },
	end: { width: 150, commit: true },
};

function setup(options?: Parameters<typeof createSwipeMachine>[0]) {
	const m = createSwipeMachine(options);
	m.setLayout(layout);
	return m;
}

/** Drags horizontally from x=200 by `dx`, spread over `ms`, without releasing. */
function drag(m: SwipeMachine, dx: number, ms = 300, y = 100) {
	const steps = 10;
	m.down({ x: 200, y, time: 0 });
	for (let i = 1; i <= steps; i++) {
		m.move({ x: 200 + (dx * i) / steps, y, time: (ms * i) / steps });
	}
	return ms;
}

function release(m: SwipeMachine, dx: number, ms = 300) {
	const end = drag(m, dx, ms);
	m.up({ x: 200 + dx, y: 100, time: end });
}

function settle(m: SwipeMachine) {
	for (let i = 0; i < 300 && m.needsFrame; i++) m.tick(1 / 60);
}

describe("createSwipeMachine", () => {
	it("starts closed and idle", () => {
		expect(setup().getState()).toEqual({
			phase: "idle",
			offset: 0,
			openSide: null,
			armedSide: null,
		});
	});

	it("follows a horizontal drag once the axis locks", () => {
		const m = setup();
		m.down({ x: 200, y: 100, time: 0 });
		m.move({ x: 197, y: 100, time: 10 });
		expect(m.getState()).toMatchObject({ phase: "pending", offset: 0 });
		m.move({ x: 160, y: 102, time: 20 });
		expect(m.getState()).toMatchObject({ phase: "dragging", offset: -40 });
	});

	it("gives up on vertical drags so the page can scroll", () => {
		const m = setup();
		m.down({ x: 200, y: 100, time: 0 });
		m.move({ x: 202, y: 120, time: 10 });
		m.move({ x: 100, y: 130, time: 20 });
		expect(m.getState()).toMatchObject({ phase: "idle", offset: 0 });
	});

	it("opens past half the action width and settles there", () => {
		const m = setup();
		release(m, -100);
		expect(m.getState()).toMatchObject({ phase: "settling", openSide: "end" });
		settle(m);
		expect(m.getState()).toEqual({
			phase: "idle",
			offset: -150,
			openSide: "end",
			armedSide: null,
		});
	});

	it("springs back closed after a short, slow drag", () => {
		const m = setup();
		release(m, 30, 600);
		settle(m);
		expect(m.getState()).toMatchObject({ offset: 0, openSide: null });
	});

	it("opens on a quick flick over a short distance", () => {
		const m = setup();
		release(m, -30, 30);
		settle(m);
		expect(m.getState()).toMatchObject({ offset: -150, openSide: "end" });
	});

	it("closes an open row on tap", () => {
		const m = setup();
		m.open("start");
		settle(m);
		m.down({ x: 200, y: 100, time: 0 });
		m.up({ x: 200, y: 100, time: 50 });
		settle(m);
		expect(m.getState()).toMatchObject({ offset: 0, openSide: null });
	});

	it("drags from where the row already is", () => {
		const m = setup();
		m.open("end");
		settle(m);
		drag(m, 20);
		expect(m.getState().offset).toBe(-130);
	});

	it("rubber-bands past the action width on a side with no commit", () => {
		const m = setup();
		drag(m, -300);
		const { offset } = m.getState();
		expect(offset).toBeLessThan(-150);
		expect(offset).toBeGreaterThan(-190);
	});

	it("rubber-bands immediately towards a side with no actions", () => {
		const m = createSwipeMachine();
		m.setLayout({ rowWidth: W, end: { width: 150 } });
		drag(m, 100);
		expect(m.getState().offset).toBeGreaterThan(0);
		expect(m.getState().offset).toBeLessThan(40);
	});

	it("returns to its previous position when the pointer is cancelled", () => {
		const m = setup();
		m.open("end");
		settle(m);
		drag(m, 100);
		m.cancel();
		settle(m);
		expect(m.getState()).toMatchObject({ offset: -150, openSide: "end" });
	});

	it("jumps straight to targets with reduced motion", () => {
		const m = setup({ reducedMotion: true });
		m.open("end");
		expect(m.needsFrame).toBe(false);
		expect(m.getState()).toMatchObject({ phase: "idle", offset: -150 });
	});

	it("notifies subscribers and stops after unsubscribing", () => {
		const m = setup();
		const seen: number[] = [];
		const off = m.subscribe((s) => seen.push(s.offset));
		drag(m, -50);
		off();
		m.move({ x: 0, y: 100, time: 400 });
		expect(seen.at(-1)).toBe(-50);
	});

	it("keeps an open row pinned when the layout changes", () => {
		const m = setup();
		m.open("end");
		settle(m);
		m.setLayout({ ...layout, end: { width: 200 } });
		expect(m.getState()).toMatchObject({ offset: -200, openSide: "end" });
	});

	describe("right-to-left", () => {
		it("reveals the start side by dragging left", () => {
			const m = createSwipeMachine();
			m.setLayout({ ...layout, dir: "rtl" });
			release(m, -100);
			settle(m);
			expect(m.getState()).toMatchObject({ offset: -90, openSide: "start" });
		});

		it("opens and commits towards the mirrored edge", () => {
			const m = createSwipeMachine();
			m.setLayout({ ...committable, dir: "rtl" });
			m.open("end");
			settle(m);
			expect(m.getState().offset).toBe(150);
			m.commit("end");
			settle(m);
			expect(m.getState().offset).toBe(W + 20);
		});

		it("flips an open row when the direction changes", () => {
			const m = setup();
			m.open("end");
			settle(m);
			m.setLayout({ ...layout, dir: "rtl" });
			expect(m.getState()).toMatchObject({ offset: 150, openSide: "end" });
		});
	});

	describe("edge guard", () => {
		it("ignores drags that start at the leading screen edge", () => {
			const m = createSwipeMachine({ edgeGuard: 24 });
			m.setLayout(layout);
			m.down({ x: 10, y: 100, time: 0 });
			m.move({ x: 120, y: 100, time: 100 });
			expect(m.getState()).toMatchObject({ phase: "idle", offset: 0 });
		});

		it("still follows drags that start away from the edge", () => {
			const m = createSwipeMachine({ edgeGuard: 24 });
			m.setLayout(layout);
			drag(m, 40);
			expect(m.getState().offset).toBe(40);
		});

		it("guards the right edge in rtl", () => {
			const m = createSwipeMachine({ edgeGuard: 24 });
			m.setLayout({ ...layout, dir: "rtl", viewportWidth: 400 });
			m.down({ x: 390, y: 100, time: 0 });
			m.move({ x: 300, y: 100, time: 100 });
			expect(m.getState().phase).toBe("idle");
		});
	});

	describe("full-swipe commit", () => {
		function setupCommit(onCommit?: (side: string) => void) {
			const m = createSwipeMachine({ onCommit });
			m.setLayout(committable);
			return m;
		}

		it("lets a committable side travel the full row width", () => {
			const m = setupCommit();
			drag(m, -300);
			expect(m.getState().offset).toBe(-300);
		});

		it("arms past 60% of the row and disarms coming back", () => {
			const m = setupCommit();
			drag(m, -240);
			expect(m.getState().armedSide).toBe("end");
			m.move({ x: 100, y: 100, time: 400 });
			expect(m.getState().armedSide).toBeNull();
		});

		it("slides off-screen and fires onCommit once it lands", () => {
			const commits: string[] = [];
			const m = setupCommit((side) => commits.push(side));
			release(m, -260);
			expect(m.getState()).toMatchObject({
				phase: "committing",
				armedSide: "end",
			});
			expect(commits).toEqual([]);
			settle(m);
			expect(m.getState()).toMatchObject({
				phase: "committed",
				offset: -(W + 20),
			});
			expect(commits).toEqual(["end"]);
		});

		it("commits from the keyboard without a drag", () => {
			const commits: string[] = [];
			const m = setupCommit((side) => commits.push(side));
			m.commit("start");
			settle(m);
			expect(m.getState()).toMatchObject({
				offset: W + 20,
				armedSide: "start",
			});
			expect(commits).toEqual(["start"]);
		});

		it("ignores input once committed", () => {
			const commits: string[] = [];
			const m = setupCommit((side) => commits.push(side));
			m.commit("end");
			m.commit("start");
			m.open("start");
			m.close();
			drag(m, 200);
			settle(m);
			expect(m.getState().phase).toBe("committed");
			expect(commits).toEqual(["end"]);
		});

		it("does nothing for a side without a commit action", () => {
			const m = setup();
			m.commit("end");
			expect(m.getState()).toMatchObject({ phase: "idle", offset: 0 });
		});

		it("commits immediately with reduced motion", () => {
			const commits: string[] = [];
			const m = createSwipeMachine({
				reducedMotion: true,
				onCommit: (side) => commits.push(side),
			});
			m.setLayout(committable);
			m.commit("end");
			expect(m.getState().phase).toBe("committed");
			expect(commits).toEqual(["end"]);
		});
	});

	describe("snapshot and restore", () => {
		it("snapshots the side the row is open to", () => {
			const m = setup();
			expect(m.snapshot()).toEqual({ openSide: null });
			m.open("end");
			expect(m.snapshot()).toEqual({ openSide: "end" });
		});

		it("starts open from an initial snapshot once laid out", () => {
			const m = createSwipeMachine({ initial: { openSide: "start" } });
			m.setLayout(layout);
			expect(m.needsFrame).toBe(false);
			expect(m.getState()).toMatchObject({
				phase: "idle",
				offset: 90,
				openSide: "start",
			});
		});

		it("restores without animating", () => {
			const m = setup();
			m.restore({ openSide: "end" });
			expect(m.needsFrame).toBe(false);
			expect(m.getState().offset).toBe(-150);
		});

		it("does not snapshot a committed row as open", () => {
			const m = createSwipeMachine({ reducedMotion: true });
			m.setLayout(committable);
			m.commit("end");
			expect(m.snapshot()).toEqual({ openSide: null });
		});
	});

	describe("destroy", () => {
		it("lands a commit that is still in flight", () => {
			const commits: string[] = [];
			const m = createSwipeMachine({ onCommit: (side) => commits.push(side) });
			m.setLayout(committable);
			m.commit("end");
			m.tick(1 / 60);
			m.destroy();
			expect(commits).toEqual(["end"]);
			expect(m.getState().phase).toBe("committed");
		});

		it("drops a drag back to where the row was", () => {
			const m = setup();
			m.open("end");
			settle(m);
			drag(m, 100);
			m.destroy();
			expect(m.snapshot()).toEqual({ openSide: "end" });
			expect(m.getState()).toMatchObject({ phase: "idle", offset: -150 });
		});

		it("finishes an open that is still animating", () => {
			const m = setup();
			m.open("start");
			m.destroy();
			expect(m.getState()).toMatchObject({ offset: 90, openSide: "start" });
		});

		it("ignores everything afterwards", () => {
			const m = setup();
			const seen: unknown[] = [];
			m.subscribe((s) => seen.push(s));
			m.destroy();
			m.open("end");
			drag(m, -100);
			m.commit("end");
			expect(seen).toEqual([]);
			expect(m.getState().offset).toBe(0);
		});
	});
});
