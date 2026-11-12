import { act, cleanup } from "@testing-library/react";
import { afterEach, beforeEach } from "vitest";

// jsdom has no layout, animation or frame clock, so the browser pieces the
// adapter leans on are faked here and driven by hand from the tests.

export const ROW_WIDTH = 300;

interface FakeAnimation {
	element: Element;
	options: KeyframeAnimationOptions;
	onfinish: (() => void) | null;
	cancelled: boolean;
	cancel(): void;
}

const fakes = globalThis as unknown as {
	tuckawayFrames: Map<number, FrameRequestCallback>;
	tuckawayAnimations: FakeAnimation[];
	tuckawayClock: number;
	tuckawayHandle: number;
	tuckawayReducedMotion: boolean;
};

fakes.tuckawayFrames = new Map();
fakes.tuckawayAnimations = [];
fakes.tuckawayClock = 0;
fakes.tuckawayHandle = 0;
fakes.tuckawayReducedMotion = false;

window.requestAnimationFrame = (callback) => {
	fakes.tuckawayHandle += 1;
	fakes.tuckawayFrames.set(fakes.tuckawayHandle, callback);
	return fakes.tuckawayHandle;
};
window.cancelAnimationFrame = (handle) => {
	fakes.tuckawayFrames.delete(handle);
};

window.ResizeObserver = class {
	observe() {}
	unobserve() {}
	disconnect() {}
};

window.matchMedia = ((query: string) => ({
	matches: fakes.tuckawayReducedMotion,
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
		cancelled: false,
		cancel() {
			animation.cancelled = true;
		},
	};
	fakes.tuckawayAnimations.push(animation);
	return animation as unknown as Animation;
};

Element.prototype.setPointerCapture = () => {};

Object.defineProperty(HTMLElement.prototype, "clientWidth", {
	configurable: true,
	get: () => ROW_WIDTH,
});

/** Run the frame loop until nothing is animating, or for a set number of frames. */
export function flushFrames(limit = 200) {
	for (let i = 0; i < limit && fakes.tuckawayFrames.size > 0; i++) {
		const callbacks = [...fakes.tuckawayFrames.values()];
		fakes.tuckawayFrames.clear();
		fakes.tuckawayClock += 16;
		for (const callback of callbacks) callback(fakes.tuckawayClock);
	}
}

/** Animations started through `Element.animate` so far. */
export function runningAnimations() {
	return fakes.tuckawayAnimations;
}

export function setReducedMotion(reduced: boolean) {
	fakes.tuckawayReducedMotion = reduced;
}

/** Finish the most recent collapse, as if its animation had run to the end. */
export function finishCollapse() {
	const animation = fakes.tuckawayAnimations.at(-1);
	if (!animation) throw new Error("No row is collapsing.");
	act(() => animation.onfinish?.());
}

beforeEach(() => {
	fakes.tuckawayAnimations = [];
	fakes.tuckawayReducedMotion = false;
});

afterEach(() => {
	cleanup();
	// The shared frame loop is still waiting on any frame it asked for. Let it run
	// out, or it would never ask for another in the next test.
	flushFrames();
});
