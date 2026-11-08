import { describe, expect, it } from "vitest";
import {
	createSpring,
	isSpringAtRest,
	type SpringConfig,
	stepSpring,
} from "./spring";

const config: SpringConfig = { duration: 0.42, bounce: 0, rest: 0.3 };
const FRAME = 1 / 60;

function run(
	start: ReturnType<typeof createSpring>,
	cfg: SpringConfig,
	seconds: number,
) {
	let s = start;
	const xs: number[] = [];
	for (let t = 0; t < seconds; t += FRAME) {
		s = stepSpring(s, cfg, FRAME);
		xs.push(s.x);
	}
	return { s, xs };
}

describe("stepSpring", () => {
	it("settles on the target and stops", () => {
		const { s } = run(createSpring(0, 150), config, 1.5);
		expect(s).toEqual({ x: 150, v: 0, to: 150 });
		expect(isSpringAtRest(s, config)).toBe(true);
	});

	it("does not overshoot when bounce is 0", () => {
		const { xs } = run(createSpring(0, 150), config, 1.5);
		expect(Math.max(...xs)).toBeLessThanOrEqual(150);
	});

	it("overshoots when given bounce", () => {
		const { xs } = run(createSpring(0, 150), { ...config, bounce: 0.4 }, 1.5);
		expect(Math.max(...xs)).toBeGreaterThan(150);
	});

	it("carries initial velocity forward", () => {
		const still = stepSpring(createSpring(0, 0), config, FRAME);
		const thrown = stepSpring(createSpring(0, 0, 2000), config, FRAME);
		expect(still.x).toBe(0);
		expect(thrown.x).toBeGreaterThan(10);
	});

	it("clamps long frames so a stall does not fling the spring", () => {
		const one = stepSpring(createSpring(0, 150), config, 1 / 30);
		const stalled = stepSpring(createSpring(0, 150), config, 2);
		expect(stalled).toEqual(one);
	});

	it("leaves the state untouched for a zero-length step", () => {
		const s = createSpring(10, 150, 5);
		expect(stepSpring(s, config, 0).x).toBe(10);
	});
});
