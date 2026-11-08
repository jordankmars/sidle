import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach } from "vitest";

// jsdom has no layout, animation or frame clock, so the browser pieces the
// adapter leans on are faked here and driven by hand from the tests.

export const ROW_WIDTH = 300;

interface FakeAnimation {
	element: Element;
	options: KeyframeAnimationOptions;
	onfinish: (() => void) | null;
}

const fakes = globalThis as unknown as {
	sidleFrames: Map<number, FrameRequestCallback>;
	sidleAnimations: FakeAnimation[];
	sidleClock: number;
	sidleHandle: number;
	sidleReducedMotion: boolean;
};

fakes.sidleFrames = new Map();
fakes.sidleAnimations = [];
fakes.sidleClock = 0;
fakes.sidleHandle = 0;
fakes.sidleReducedMotion = false;

window.requestAnimationFrame = (callback) => {
	fakes.sidleHandle += 1;
	fakes.sidleFrames.set(fakes.sidleHandle, callback);
	return fakes.sidleHandle;
};
window.cancelAnimationFrame = (handle) => {
	fakes.sidleFrames.delete(handle);
};

window.ResizeObserver = class {
	observe() {}
	unobserve() {}
	disconnect() {}
};

window.matchMedia = ((query: string) => ({
	matches: fakes.sidleReducedMotion,
	media: query,
})) as typeof window.matchMedia;

Element.prototype.animate = function animate(
	_keyframes: Keyframe[] | PropertyIndexedKeyframes | null,
	options?: number | KeyframeAnimationOptions,
) {
	const animation: FakeAnimation = {
		element: this,
		options: typeof options === "object" ? options : {},
		onfinish: null,
	};
	fakes.sidleAnimations.push(animation);
	return animation as unknown as Animation;
};

Element.prototype.setPointerCapture = () => {};

Object.defineProperty(HTMLElement.prototype, "clientWidth", {
	configurable: true,
	get: () => ROW_WIDTH,
});

/** Run the frame loop until nothing is animating, or for a set number of frames. */
export function flushFrames(limit = 200) {
	for (let i = 0; i < limit && fakes.sidleFrames.size > 0; i++) {
		const callbacks = [...fakes.sidleFrames.values()];
		fakes.sidleFrames.clear();
		fakes.sidleClock += 16;
		for (const callback of callbacks) callback(fakes.sidleClock);
	}
}

/** Animations started through `Element.animate` so far. */
export function runningAnimations() {
	return fakes.sidleAnimations;
}

export function setReducedMotion(reduced: boolean) {
	fakes.sidleReducedMotion = reduced;
}

beforeEach(() => {
	fakes.sidleFrames.clear();
	fakes.sidleAnimations = [];
	fakes.sidleReducedMotion = false;
});

afterEach(() => {
	cleanup();
});
