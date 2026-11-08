/** Anything that animates in steps and can say when it is done. */
export interface Tickable {
	tick(dt: number): void;
	readonly needsFrame: boolean;
}

export interface FrameScheduler {
	request(callback: (now: number) => void): number;
	cancel(handle: number): void;
}

export interface FrameLoop {
	/** Start driving a tickable. Returns a function that stops driving it. */
	add(item: Tickable): () => void;
	/** Call after poking a tickable so the loop picks it up if it was asleep. */
	wake(): void;
	/** Stop the loop and forget everything it was driving. */
	destroy(): void;
}

/**
 * One frame loop shared by every row on the page. It sleeps when nothing is
 * moving and runs one callback per frame when something is.
 */
export function createFrameLoop(scheduler: FrameScheduler): FrameLoop {
	const items = new Set<Tickable>();
	let handle: number | null = null;
	let last = 0;

	function busy() {
		for (const item of items) if (item.needsFrame) return true;
		return false;
	}

	function frame(now: number) {
		const dt = (now - last) / 1000;
		last = now;
		handle = null;
		for (const item of items) {
			if (item.needsFrame) item.tick(dt);
		}
		if (busy()) {
			handle = scheduler.request(frame);
		}
	}

	function wake() {
		if (handle !== null) return;
		if (!busy()) return;
		// Start the clock on the first frame so the first step isn't a huge jump.
		handle = scheduler.request((now) => {
			last = now;
			handle = scheduler.request(frame);
		});
	}

	return {
		add(item) {
			items.add(item);
			wake();
			return () => {
				items.delete(item);
			};
		},
		wake,
		destroy() {
			if (handle !== null) scheduler.cancel(handle);
			handle = null;
			items.clear();
		},
	};
}
