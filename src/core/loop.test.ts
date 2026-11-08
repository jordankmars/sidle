import { describe, expect, it } from "vitest";
import { createFrameLoop, type Tickable } from "./loop";

function fakeScheduler() {
	let queue = new Map<number, (now: number) => void>();
	let id = 0;
	let now = 0;
	return {
		request(cb: (now: number) => void) {
			queue.set(++id, cb);
			return id;
		},
		cancel(handle: number) {
			queue.delete(handle);
		},
		/** Run one frame, `ms` after the last one. */
		step(ms = 16) {
			now += ms;
			const current = queue;
			queue = new Map();
			for (const cb of current.values()) cb(now);
		},
		get pending() {
			return queue.size;
		},
	};
}

function counter(frames: number): Tickable & { dts: number[] } {
	const dts: number[] = [];
	return {
		dts,
		tick(dt) {
			dts.push(dt);
		},
		get needsFrame() {
			return dts.length < frames;
		},
	};
}

describe("createFrameLoop", () => {
	it("ticks items with the elapsed time in seconds", () => {
		const s = fakeScheduler();
		const loop = createFrameLoop(s);
		const item = counter(2);
		loop.add(item);
		s.step(); // starts the clock
		s.step(16);
		s.step(20);
		expect(item.dts).toEqual([0.016, 0.02]);
	});

	it("goes to sleep when nothing needs a frame", () => {
		const s = fakeScheduler();
		const loop = createFrameLoop(s);
		loop.add(counter(1));
		s.step();
		s.step();
		expect(s.pending).toBe(0);
	});

	it("does not schedule anything for idle items", () => {
		const s = fakeScheduler();
		const loop = createFrameLoop(s);
		loop.add(counter(0));
		expect(s.pending).toBe(0);
	});

	it("wakes up again when asked", () => {
		const s = fakeScheduler();
		const loop = createFrameLoop(s);
		let busy = false;
		const ticks: number[] = [];
		loop.add({
			tick: (dt) => {
				ticks.push(dt);
				busy = false;
			},
			get needsFrame() {
				return busy;
			},
		});
		busy = true;
		loop.wake();
		s.step();
		s.step();
		expect(ticks).toHaveLength(1);
	});

	it("stops ticking removed items", () => {
		const s = fakeScheduler();
		const loop = createFrameLoop(s);
		const item = counter(10);
		const remove = loop.add(item);
		s.step();
		s.step();
		remove();
		s.step();
		expect(item.dts).toHaveLength(1);
		expect(s.pending).toBe(0);
	});

	it("cancels the pending frame on destroy", () => {
		const s = fakeScheduler();
		const loop = createFrameLoop(s);
		loop.add(counter(10));
		loop.destroy();
		expect(s.pending).toBe(0);
	});
});
