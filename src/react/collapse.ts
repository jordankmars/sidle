const DURATION = 220;
const EASING = "cubic-bezier(.3,0,.2,1)";

/**
 * Shrink a row to nothing, then call `done`. The row stays collapsed afterwards
 * so it can't flash back in the gap before React removes it. Returns a function
 * that calls `done` right away, for when the row is unmounted part way through.
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
	return finish;
}
