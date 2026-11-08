import { describe, expect, it } from "vitest";
import { sideOf, signOf, startSign } from "./direction";

describe("direction", () => {
	it("reveals start with a positive offset in ltr", () => {
		expect(startSign("ltr")).toBe(1);
		expect(signOf("start", "ltr")).toBe(1);
		expect(signOf("end", "ltr")).toBe(-1);
		expect(sideOf(40, "ltr")).toBe("start");
		expect(sideOf(-40, "ltr")).toBe("end");
	});

	it("mirrors everything in rtl", () => {
		expect(startSign("rtl")).toBe(-1);
		expect(signOf("start", "rtl")).toBe(-1);
		expect(signOf("end", "rtl")).toBe(1);
		expect(sideOf(40, "rtl")).toBe("end");
		expect(sideOf(-40, "rtl")).toBe("start");
	});

	it("has no side at rest", () => {
		expect(sideOf(0)).toBeNull();
	});
});
