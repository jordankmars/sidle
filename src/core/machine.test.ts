import { describe, expect, it } from "vitest";
import { createSwipeMachine, type SwipeMachine } from "./machine";

const W = 380;
const layout = {
	rowWidth: W,
	start: { width: 90 },
	end: { width: 150 },
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
});
