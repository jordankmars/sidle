import { createFrameLoop } from "../core";

/**
 * One loop for every row on the page. It asks for nothing until a row starts
 * moving, so importing this on the server is harmless.
 */
export const frameLoop = /* @__PURE__ */ createFrameLoop({
	request: (callback) => requestAnimationFrame(callback),
	cancel: (handle) => cancelAnimationFrame(handle),
});
