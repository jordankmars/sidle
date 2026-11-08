import { describe, expect, it } from "vitest";
import { clamp, rubber } from "./math";

describe("clamp", () => {
	it("keeps values inside the range", () => {
		expect(clamp(5, 0, 10)).toBe(5);
		expect(clamp(-5, 0, 10)).toBe(0);
		expect(clamp(15, 0, 10)).toBe(10);
	});
});

describe("rubber", () => {
	it("returns 0 with no overshoot", () => {
		expect(rubber(0, 40)).toBe(0);
		expect(rubber(-10, 40)).toBe(0);
	});

	it("grows with overshoot but never reaches the limit", () => {
		const a = rubber(20, 40);
		const b = rubber(200, 40);
		const c = rubber(100_000, 40);
		expect(a).toBeGreaterThan(0);
		expect(b).toBeGreaterThan(a);
		expect(c).toBeLessThan(40);
		expect(c).toBeGreaterThan(39.9);
	});

	it("moves less than the pointer does", () => {
		expect(rubber(30, 40)).toBeLessThan(30);
	});
});
