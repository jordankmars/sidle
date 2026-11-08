import { describe, expect, it } from "vitest";
import { armedSide, resolveRelease } from "./release";
import type { Sides } from "./sides";

const W = 380;
const sides: Sides = {
	start: { width: 90, commit: true },
	end: { width: 150, commit: true },
};

describe("armedSide", () => {
	it("arms once past 60% of the row", () => {
		expect(armedSide({ offset: -W * 0.59, rowWidth: W, sides })).toBeNull();
		expect(armedSide({ offset: -W * 0.61, rowWidth: W, sides })).toBe("end");
		expect(armedSide({ offset: W * 0.61, rowWidth: W, sides })).toBe("start");
	});

	it("never arms a side without a commit action", () => {
		const noCommit: Sides = { end: { width: 150 } };
		expect(armedSide({ offset: -W, rowWidth: W, sides: noCommit })).toBeNull();
	});

	it("mirrors sides in right-to-left layouts", () => {
		expect(armedSide({ offset: -W, rowWidth: W, sides, dir: "rtl" })).toBe(
			"start",
		);
	});
});

describe("resolveRelease", () => {
	it("closes a short, slow drag", () => {
		expect(
			resolveRelease({ offset: -40, velocity: 0, rowWidth: W, sides }),
		).toEqual({ type: "close" });
	});

	it("opens past half the side's width", () => {
		expect(
			resolveRelease({ offset: -80, velocity: 0, rowWidth: W, sides }),
		).toEqual({ type: "open", side: "end" });
		expect(
			resolveRelease({ offset: 50, velocity: 0, rowWidth: W, sides }),
		).toEqual({ type: "open", side: "start" });
	});

	it("opens on a quick flick even over a short distance", () => {
		expect(
			resolveRelease({ offset: -20, velocity: -800, rowWidth: W, sides }),
		).toEqual({ type: "open", side: "end" });
	});

	it("closes an open row flicked back towards closed", () => {
		expect(
			resolveRelease({ offset: -150, velocity: 1000, rowWidth: W, sides }),
		).toEqual({ type: "close" });
	});

	it("commits when released past the threshold", () => {
		expect(
			resolveRelease({ offset: -300, velocity: 0, rowWidth: W, sides }),
		).toEqual({ type: "commit", side: "end" });
	});

	it("commits even if the pointer is moving back", () => {
		expect(
			resolveRelease({ offset: 300, velocity: -2000, rowWidth: W, sides }),
		).toEqual({ type: "commit", side: "start" });
	});

	it("closes towards a side that has no actions", () => {
		expect(
			resolveRelease({
				offset: 80,
				velocity: 0,
				rowWidth: W,
				sides: { end: sides.end },
			}),
		).toEqual({ type: "close" });
	});

	it("opens instead of committing when the side has no commit action", () => {
		expect(
			resolveRelease({
				offset: -300,
				velocity: 0,
				rowWidth: W,
				sides: { end: { width: 150 } },
			}),
		).toEqual({ type: "open", side: "end" });
	});

	it("opens the mirrored side in right-to-left layouts", () => {
		expect(
			resolveRelease({
				offset: 80,
				velocity: 0,
				rowWidth: W,
				sides,
				dir: "rtl",
			}),
		).toEqual({ type: "open", side: "end" });
	});
});
