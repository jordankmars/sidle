import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Action, Actions, Content, Row } from "./index";
import { finishCollapse, flushFrames, setReducedMotion } from "./test-setup";

function swipe(element: Element, from: number, to: number) {
	const point = { clientY: 10, pointerId: 1 };
	fireEvent.pointerDown(element, { ...point, button: 0, clientX: from });
	fireEvent.pointerMove(element, { ...point, clientX: to });
	fireEvent.pointerUp(element, { ...point, clientX: to });
	flushFrames();
}

function dragOnly(element: Element, from: number, to: number) {
	const point = { clientY: 10, pointerId: 1 };
	fireEvent.pointerDown(element, { ...point, button: 0, clientX: from });
	fireEvent.pointerMove(element, { ...point, clientX: to });
}

const content = () => screen.getByTestId("content");
const startPanel = () => screen.getByTestId("start");
const endPanel = () => screen.getByTestId("end");
const button = (name: string) =>
	screen.getByRole("button", { hidden: true, name });

function setup({
	width,
	archive = vi.fn(),
	flag = vi.fn(),
	remove = vi.fn(),
	dir,
}: {
	width?: number;
	archive?: () => void;
	flag?: () => void;
	remove?: () => void;
	dir?: "ltr" | "rtl";
} = {}) {
	const tree = render(
		<Row dir={dir} data-testid="row">
			<Actions side="start" data-testid="start">
				<Action onSelect={archive}>Archive</Action>
			</Actions>
			<Content data-testid="content">Hello</Content>
			<Actions side="end" width={width} data-testid="end">
				<Action onSelect={flag}>Flag</Action>
				<Action onSelect={remove} commit>
					Delete
				</Action>
			</Actions>
		</Row>,
	);
	return { ...tree, archive, flag, remove };
}

describe("Actions and Action", () => {
	it("starts closed, marked up with its side", () => {
		setup();
		expect(endPanel().style.width).toBe("0px");
		expect(endPanel().dataset.side).toBe("end");
		expect(startPanel().style.insetInlineStart).toBe("0px");
		expect(endPanel().style.insetInlineEnd).toBe("0px");
		expect(button("Delete").hasAttribute("data-commit")).toBe(true);
		expect(button("Flag").hasAttribute("data-commit")).toBe(false);
		expect(button("Flag").getAttribute("type")).toBe("button");
	});

	it("opens to 75px per action by default", () => {
		setup();
		swipe(content(), 250, 170);
		expect(content().style.transform).toBe("translateX(-150px)");
		expect(endPanel().style.width).toBe("150px");
		expect(startPanel().style.width).toBe("0px");
		expect(screen.getByTestId("row").dataset.openSide).toBe("end");
	});

	it("opens to a set width", () => {
		setup({ width: 200 });
		swipe(content(), 280, 170);
		expect(content().style.transform).toBe("translateX(-200px)");
	});

	it("keeps an open row open when the width changes", () => {
		const tree = (width: number) => (
			<Row>
				<Content data-testid="content">Hello</Content>
				<Actions side="end" width={width}>
					<Action onSelect={() => {}}>Flag</Action>
				</Actions>
			</Row>
		);
		const { rerender } = render(tree(100));
		swipe(content(), 250, 170);
		expect(content().style.transform).toBe("translateX(-100px)");
		rerender(tree(120));
		expect(content().style.transform).toBe("translateX(-120px)");
	});

	it("only tabs to the buttons on the open side", () => {
		setup();
		expect(button("Flag").tabIndex).toBe(-1);
		swipe(content(), 250, 170);
		expect(button("Flag").tabIndex).toBe(0);
		expect(button("Delete").tabIndex).toBe(0);
		expect(button("Archive").tabIndex).toBe(-1);
	});

	it("reveals the other way round in rtl", () => {
		setup({ dir: "rtl" });
		swipe(content(), 170, 250);
		expect(content().style.transform).toBe("translateX(150px)");
		expect(screen.getByTestId("row").dataset.openSide).toBe("end");
		expect(endPanel().style.width).toBe("150px");
	});

	it("arms the main action past the commit point and shrinks the others", () => {
		setup();
		dragOnly(content(), 280, 80);
		expect(endPanel().hasAttribute("data-armed")).toBe(true);
		expect(button("Flag").style.flexGrow).toBe("0.0001");
		fireEvent.pointerMove(content(), {
			clientX: 200,
			clientY: 10,
			pointerId: 1,
		});
		expect(endPanel().hasAttribute("data-armed")).toBe(false);
		expect(button("Flag").style.flexGrow).toBe("1");
	});

	it("commits the main action on a full swipe", () => {
		const { remove, flag } = setup();
		swipe(content(), 280, 60);
		finishCollapse();
		expect(remove).toHaveBeenCalledOnce();
		expect(flag).not.toHaveBeenCalled();
	});

	it("doesn't commit a side with no commit action", () => {
		const { archive } = setup();
		swipe(content(), 40, 260);
		expect(archive).not.toHaveBeenCalled();
		expect(content().style.transform).toBe("translateX(75px)");
	});

	it("runs a plain action straight away and closes the row", () => {
		const { flag } = setup();
		swipe(content(), 250, 170);
		fireEvent.click(button("Flag"));
		expect(flag).toHaveBeenCalledOnce();
		flushFrames();
		expect(content().style.transform).toBe("");
	});

	it("commits when the main action's button is tapped", () => {
		const { remove } = setup();
		swipe(content(), 250, 170);
		fireEvent.click(button("Delete"));
		flushFrames();
		finishCollapse();
		expect(remove).toHaveBeenCalledOnce();
	});

	describe("with two commit actions on a side", () => {
		function setupTwoCommits() {
			const archive = vi.fn();
			const remove = vi.fn();
			render(
				<Row>
					<Content data-testid="content">Hello</Content>
					<Actions side="end">
						<Action onSelect={archive} commit>
							Archive
						</Action>
						<Action onSelect={remove} commit>
							Delete
						</Action>
					</Actions>
				</Row>,
			);
			return { archive, remove };
		}

		it("runs the one that was tapped", () => {
			const { archive, remove } = setupTwoCommits();
			swipe(content(), 250, 170);
			fireEvent.click(button("Archive"));
			flushFrames();
			finishCollapse();
			expect(archive).toHaveBeenCalledOnce();
			expect(remove).not.toHaveBeenCalled();
		});

		it("sticks with the first one tapped", () => {
			const { archive, remove } = setupTwoCommits();
			swipe(content(), 250, 170);
			fireEvent.click(button("Archive"));
			fireEvent.click(button("Delete"));
			flushFrames();
			finishCollapse();
			expect(archive).toHaveBeenCalledOnce();
			expect(remove).not.toHaveBeenCalled();
		});

		it("runs the last one on a full swipe", () => {
			const { archive, remove } = setupTwoCommits();
			swipe(content(), 280, 60);
			finishCollapse();
			expect(remove).toHaveBeenCalledOnce();
			expect(archive).not.toHaveBeenCalled();
		});
	});

	it("uses the latest onSelect", () => {
		const first = vi.fn();
		const second = vi.fn();
		const tree = (onSelect: () => void) => (
			<Row>
				<Content data-testid="content">Hello</Content>
				<Actions side="end">
					<Action onSelect={onSelect}>Flag</Action>
				</Actions>
			</Row>
		);
		const { rerender } = render(tree(first));
		rerender(tree(second));
		fireEvent.click(button("Flag"));
		expect(first).not.toHaveBeenCalled();
		expect(second).toHaveBeenCalledOnce();
	});

	it("lets onClick cancel the action", () => {
		const onSelect = vi.fn();
		render(
			<Row>
				<Content>Hello</Content>
				<Actions side="end">
					<Action onSelect={onSelect} onClick={(e) => e.preventDefault()}>
						Flag
					</Action>
				</Actions>
			</Row>,
		);
		fireEvent.click(button("Flag"));
		expect(onSelect).not.toHaveBeenCalled();
	});

	it("turns the grow transition off for reduced motion", () => {
		setReducedMotion(true);
		setup();
		expect(button("Flag").style.transition).toBe("none");
	});

	it("throws a useful error for an Action outside Actions", () => {
		const error = vi.spyOn(console, "error").mockImplementation(() => {});
		expect(() =>
			render(
				<Row>
					<Action onSelect={() => {}}>Flag</Action>
				</Row>,
			),
		).toThrow("must be inside a Sidle.Actions");
		error.mockRestore();
	});
});
