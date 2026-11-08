const DURATION = 220;
const EASING = "cubic-bezier(.3,0,.2,1)";

/**
 * Shrink a row to nothing, then call `done`. The row stays collapsed afterwards
 * so it can't flash back in the gap before React removes it. Returns a function
 * for when the row is disconnected: it calls `done` if that hasn't happened yet
 * and gives the row its height back, in case React reuses the element.
 */
export function collapseRow(
	row: HTMLElement,
	{ reducedMotion }: { reducedMotion: boolean },
	done: () => void,
): () => void {
	let finished = false;
	function finish() {
		if (finished) return;
		finished = true;
		done();
	}

	const animation = row.animate(
		[{ height: `${row.offsetHeight}px` }, { height: "0px" }],
		{
			duration: reducedMotion ? 1 : DURATION,
			easing: EASING,
			fill: "forwards",
		},
	);
	animation.onfinish = finish;
	return () => {
		finish();
		animation.cancel();
	};
}
