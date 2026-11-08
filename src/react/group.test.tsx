import { describe, expect, it } from "vitest";
import { createGroupController, getPageGroup } from "./group";

function rows(count: number) {
	const elements = Array.from({ length: count }, () =>
		document.body.appendChild(document.createElement("div")),
	);
	return elements;
}

describe("createGroupController", () => {
	it("hands focus to the next row in document order", () => {
		const [a, b, c] = rows(3);
		const group = createGroupController();
		// Registered out of order, the way a virtualized list can mount them.
		group.addRow(c);
		group.addRow(a);
		group.addRow(b);
		expect(group.neighbor(a)).toBe(b);
		expect(group.neighbor(b)).toBe(c);
	});

	it("falls back to the previous row at the end of the list", () => {
		const [a, b] = rows(2);
		const group = createGroupController();
		group.addRow(a);
		group.addRow(b);
		expect(group.neighbor(b)).toBe(a);
	});

	it("skips rows that have already been committed", () => {
		const [a, b, c] = rows(3);
		const group = createGroupController();
		for (const row of [a, b, c]) group.addRow(row);
		b.dataset.phase = "committed";
		expect(group.neighbor(a)).toBe(c);
	});

	it("has no neighbor for the only row", () => {
		const [a] = rows(1);
		const group = createGroupController();
		group.addRow(a);
		expect(group.neighbor(a)).toBeNull();
	});

	it("forgets rows that are removed", () => {
		const [a, b] = rows(2);
		const group = createGroupController();
		group.addRow(a);
		const remove = group.addRow(b);
		remove();
		expect(group.neighbor(a)).toBeNull();
	});
});

describe("getPageGroup", () => {
	it("returns the same group every time", () => {
		expect(getPageGroup()).toBe(getPageGroup());
	});
});
