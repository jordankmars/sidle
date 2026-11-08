import { describe, expect, it } from "vitest";
import { inEdgeZone } from "./edge";

describe("inEdgeZone", () => {
	it("is off when the size is 0", () => {
		expect(inEdgeZone(0, { size: 0 })).toBe(false);
	});

	it("guards the left edge in ltr", () => {
		expect(inEdgeZone(10, { size: 24 })).toBe(true);
		expect(inEdgeZone(30, { size: 24 })).toBe(false);
	});

	it("guards the right edge in rtl", () => {
		const zone = { size: 24, viewportWidth: 400, dir: "rtl" as const };
		expect(inEdgeZone(390, zone)).toBe(true);
		expect(inEdgeZone(10, zone)).toBe(false);
	});

	it("can't guard rtl without knowing the viewport width", () => {
		expect(inEdgeZone(390, { size: 24, dir: "rtl" })).toBe(false);
	});
});
