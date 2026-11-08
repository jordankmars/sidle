import { describe, expect, it } from "vitest";
import { detectAxis } from "./axis";

describe("detectAxis", () => {
	it("waits until the pointer passes the slop", () => {
		expect(detectAxis(3, 3)).toBeNull();
		expect(detectAxis(5, 0)).toBeNull();
	});

	it("locks to x for mostly horizontal drags", () => {
		expect(detectAxis(8, 2)).toBe("x");
		expect(detectAxis(-8, -5)).toBe("x");
	});

	it("locks to y for mostly vertical drags", () => {
		expect(detectAxis(2, 8)).toBe("y");
		expect(detectAxis(-4, -9)).toBe("y");
	});

	it("treats a perfect diagonal as vertical so scrolling wins", () => {
		expect(detectAxis(6, 6)).toBe("y");
	});

	it("accepts a custom slop", () => {
		expect(detectAxis(8, 0, 10)).toBeNull();
		expect(detectAxis(12, 0, 10)).toBe("x");
	});
});
