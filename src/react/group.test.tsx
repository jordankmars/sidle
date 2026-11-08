import { act, fireEvent, render, screen } from "@testing-library/react";
import { StrictMode } from "react";
import { describe, expect, it, vi } from "vitest";
import { createGroupController, getPageGroup } from "./group";
import { Action, Actions, Content, Group, Row } from "./index";
import { flushFrames } from "./test-setup";

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

function SwipeRow({ name, onClick }: { name: string; onClick?: () => void }) {
	return (
		<Row value={name} data-testid={`row-${name}`}>
			<Content data-testid={name} onClick={onClick}>
				{name}
			</Content>
			<Actions side="end">
				<Action onSelect={() => {}}>Flag</Action>
			</Actions>
		</Row>
	);
}

function open(name: string) {
	const element = screen.getByTestId(name);
	const point = { clientY: 10, pointerId: 1 };
	fireEvent.pointerDown(element, { ...point, button: 0, clientX: 250 });
	fireEvent.pointerMove(element, { ...point, clientX: 170 });
	fireEvent.pointerUp(element, { ...point, clientX: 170 });
	act(() => flushFrames());
}

function tap(name: string) {
	const element = screen.getByTestId(name);
	const point = { clientX: 250, clientY: 10, pointerId: 2 };
	fireEvent.pointerDown(element, { ...point, button: 0 });
	fireEvent.pointerUp(element, point);
	// A real click has a detail of 1. Only keyboard clicks have 0.
	fireEvent.click(element, { detail: 1 });
	act(() => flushFrames());
}

const isOpen = (name: string) =>
	screen.getByTestId(`row-${name}`).dataset.openSide === "end";

describe("Group", () => {
	it("keeps one row open across the page with no wrapper", () => {
		render(
			<>
				<SwipeRow name="a" />
				<SwipeRow name="b" />
			</>,
		);
		open("a");
		expect(isOpen("a")).toBe(true);
		open("b");
		expect(isOpen("a")).toBe(false);
		expect(isOpen("b")).toBe(true);
	});

	it("lets separate groups each keep a row open", () => {
		render(
			<>
				<Group>
					<SwipeRow name="a" />
				</Group>
				<Group>
					<SwipeRow name="b" />
				</Group>
			</>,
		);
		open("a");
		open("b");
		expect(isOpen("a")).toBe(true);
		expect(isOpen("b")).toBe(true);
	});

	it("closes the open row on a tap outside every row", () => {
		render(
			<>
				<button type="button" data-testid="outside">
					Outside
				</button>
				<Group>
					<SwipeRow name="a" />
				</Group>
				<Group>
					<SwipeRow name="b" />
				</Group>
			</>,
		);
		open("a");
		fireEvent.pointerDown(screen.getByTestId("outside"));
		act(() => flushFrames());
		expect(isOpen("a")).toBe(false);
	});

	describe("a tap on another row while one is open", () => {
		function setup() {
			const onClick = vi.fn();
			render(
				<Group>
					<SwipeRow name="a" />
					<SwipeRow name="b" onClick={onClick} />
				</Group>,
			);
			open("a");
			return onClick;
		}

		it("closes the open row as soon as the pointer lands", () => {
			setup();
			fireEvent.pointerDown(screen.getByTestId("b"), {
				button: 0,
				clientX: 250,
				clientY: 10,
				pointerId: 2,
			});
			act(() => flushFrames());
			expect(isOpen("a")).toBe(false);
		});

		it("doesn't activate the tapped row, but the next tap does", () => {
			const onClick = setup();
			tap("b");
			expect(isOpen("a")).toBe(false);
			expect(onClick).not.toHaveBeenCalled();
			tap("b");
			expect(onClick).toHaveBeenCalledOnce();
		});

		it("still activates the row from the keyboard", () => {
			const onClick = setup();
			const element = screen.getByTestId("b");
			act(() => element.focus());
			fireEvent.keyDown(element, { key: "Enter" });
			expect(onClick).toHaveBeenCalledOnce();
		});
	});

	it("leaves another group's open row alone on a tap", () => {
		const onClick = vi.fn();
		render(
			<>
				<Group>
					<SwipeRow name="a" />
				</Group>
				<Group>
					<SwipeRow name="b" onClick={onClick} />
				</Group>
			</>,
		);
		open("a");
		tap("b");
		expect(isOpen("a")).toBe(true);
		expect(onClick).toHaveBeenCalledOnce();
	});

	it("doesn't swallow a tap for an open row that isn't mounted", () => {
		const onClick = vi.fn();
		const tree = (show: boolean) => (
			<Group>
				{show && <SwipeRow name="a" />}
				<SwipeRow name="b" onClick={onClick} />
			</Group>
		);
		const { rerender } = render(tree(true));
		open("a");
		rerender(tree(false));
		tap("b");
		expect(onClick).toHaveBeenCalledOnce();
	});

	it("brings an unmounted row back open by value", () => {
		const tree = (show: boolean) => (
			<Group>
				<SwipeRow name="a" />
				{show && <SwipeRow name="b" />}
			</Group>
		);
		const { rerender } = render(tree(true));
		open("b");
		rerender(tree(false));
		rerender(tree(true));
		expect(isOpen("b")).toBe(true);
		expect(screen.getByTestId("b").style.transform).toBe("translateX(-75px)");
	});

	it("registers each row once under StrictMode", () => {
		render(
			<StrictMode>
				<Group>
					<SwipeRow name="a" />
					<SwipeRow name="b" />
				</Group>
			</StrictMode>,
		);
		open("a");
		open("b");
		expect(isOpen("a")).toBe(false);
		expect(isOpen("b")).toBe(true);
	});
});
