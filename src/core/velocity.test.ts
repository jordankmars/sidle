import { describe, expect, it } from "vitest";
import { createVelocityTracker } from "./velocity";

describe("createVelocityTracker", () => {
	it("is 0 with fewer than two samples", () => {
		const t = createVelocityTracker();
		expect(t.velocity()).toBe(0);
		t.add(10, 0);
		expect(t.velocity()).toBe(0);
	});

	it("measures px per second", () => {
		const t = createVelocityTracker();
		t.add(0, 0);
		t.add(10, 10);
		t.add(20, 20);
		expect(t.velocity()).toBe(1000);
	});

	it("only looks at the recent window", () => {
		const t = createVelocityTracker();
		// A slow start, then a fast flick at the end.
		for (let i = 0; i <= 50; i++) t.add(i, i * 10);
		for (let i = 1; i <= 5; i++) t.add(50 + i * 20, 500 + i * 10);
		expect(t.velocity()).toBeGreaterThan(1000);
	});

	it("ignores samples with no elapsed time", () => {
		const t = createVelocityTracker();
		t.add(0, 5);
		t.add(10, 5);
		expect(t.velocity()).toBe(0);
	});

	it("starts over after reset", () => {
		const t = createVelocityTracker();
		t.add(0, 0);
		t.add(100, 10);
		t.reset();
		expect(t.velocity()).toBe(0);
	});
});
