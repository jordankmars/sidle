import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Action, Actions, Content, Row } from "./index";
import { finishCollapse, flushFrames } from "./test-setup";

const content = () => screen.getByTestId("content");
const row = () => screen.getByTestId("row");
const button = (name: string) =>
	screen.getByRole("button", { hidden: true, name });

function press(key: string, init: KeyboardEventInit = {}) {
	act(() => content().focus());
	const result = fireEvent.keyDown(content(), { key, ...init });
	act(() => flushFrames());
	return result;
}

function setup({ dir }: { dir?: "ltr" | "rtl" } = {}) {
	const flag = vi.fn();
	const remove = vi.fn();
	const onClick = vi.fn();
	render(
		<Row dir={dir} data-testid="row">
			<Actions side="start">
				<Action onSelect={() => {}}>Archive</Action>
			</Actions>
			<Content data-testid="content" onClick={onClick}>
				<input aria-label="Reply" data-testid="input" />
			</Content>
			<Actions side="end">
				<Action shortcut="f" onSelect={flag}>
					Flag
				</Action>
				<Action shortcut={["Delete", "Backspace"]} onSelect={remove} commit>
					Delete
				</Action>
			</Actions>
		</Row>,
	);
	return { flag, remove, onClick };
}

describe("keyboard", () => {
	it("runs an action from its shortcut, ignoring case", () => {
		const { flag } = setup();
		expect(press("F", { shiftKey: true })).toBe(false);
		expect(flag).toHaveBeenCalledOnce();
	});

	it("runs a commit action from any of its shortcuts", () => {
		const { remove } = setup();
		press("Backspace");
		finishCollapse();
		expect(remove).toHaveBeenCalledOnce();
	});

	it("runs a shortcut once while the key is held", () => {
		const { flag } = setup();
		press("f");
		expect(press("f", { repeat: true })).toBe(false);
		expect(flag).toHaveBeenCalledOnce();
	});

	it("activates the content once while Enter is held", () => {
		const { onClick } = setup();
		press("Enter");
		press("Enter", { repeat: true });
		expect(onClick).toHaveBeenCalledOnce();
	});

	it("ignores other actions while the row is on its way out", () => {
		const { flag } = setup();
		press("Delete");
		press("f");
		expect(flag).not.toHaveBeenCalled();
	});

	it("leaves shortcuts with modifiers to the browser", () => {
		const { flag } = setup();
		expect(press("f", { metaKey: true })).toBe(true);
		expect(press("f", { ctrlKey: true })).toBe(true);
		expect(flag).not.toHaveBeenCalled();
	});

	it("ignores keys typed into something inside the row", () => {
		const { flag } = setup();
		fireEvent.keyDown(screen.getByTestId("input"), { key: "f" });
		expect(flag).not.toHaveBeenCalled();
	});

	it("lets the user's onKeyDown take over", () => {
		const onSelect = vi.fn();
		render(
			<Row>
				<Content data-testid="content" onKeyDown={(e) => e.preventDefault()}>
					Hello
				</Content>
				<Actions side="end">
					<Action shortcut="f" onSelect={onSelect}>
						Flag
					</Action>
				</Actions>
			</Row>,
		);
		press("f");
		expect(onSelect).not.toHaveBeenCalled();
	});

	it("announces the shortcuts", () => {
		setup();
		expect(content().getAttribute("aria-keyshortcuts")).toBe(
			"f Delete Backspace",
		);
	});

	it("activates the content on Enter", () => {
		const { onClick } = setup();
		press("Enter");
		expect(onClick).toHaveBeenCalledOnce();
	});

	describe("arrow keys", () => {
		it("reveal the side the row moves away from", () => {
			setup();
			press("ArrowLeft");
			expect(row().dataset.openSide).toBe("end");
			expect(button("Flag").tabIndex).toBe(0);
		});

		it("close the row when pressed the opposite way", () => {
			setup();
			press("ArrowLeft");
			press("ArrowRight");
			expect(row().dataset.openSide).toBeUndefined();
			expect(content().style.transform).toBe("");
		});

		it("flip in rtl", () => {
			setup({ dir: "rtl" });
			press("ArrowRight");
			expect(row().dataset.openSide).toBe("end");
		});
	});

	describe("Escape", () => {
		it("closes an open row", () => {
			setup();
			press("ArrowLeft");
			expect(press("Escape")).toBe(false);
			expect(row().dataset.openSide).toBeUndefined();
		});

		it("is left alone when the row is closed", () => {
			setup();
			expect(press("Escape")).toBe(true);
		});

		it("works from an action and returns focus to the row", () => {
			setup();
			press("ArrowLeft");
			act(() => button("Flag").focus());
			fireEvent.keyDown(button("Flag"), { key: "Escape" });
			act(() => flushFrames());
			expect(row().dataset.openSide).toBeUndefined();
			expect(document.activeElement).toBe(content());
		});
	});

	it("returns focus to the row after a plain action", () => {
		setup();
		press("ArrowLeft");
		act(() => button("Flag").focus());
		fireEvent.click(button("Flag"));
		expect(document.activeElement).toBe(content());
	});

	describe("focus after a commit", () => {
		function list(values: string[], onSelect: (value: string) => void) {
			return values.map((value) => (
				<Row key={value} value={`${value}-focus`}>
					<Content data-testid={value}>{value}</Content>
					<Actions side="end">
						<Action shortcut="Delete" onSelect={() => onSelect(value)} commit>
							Delete
						</Action>
					</Actions>
				</Row>
			));
		}

		function deleteFocused(value: string) {
			const element = screen.getByTestId(value);
			act(() => element.focus());
			fireEvent.keyDown(element, { key: "Delete" });
			act(() => flushFrames());
			finishCollapse();
		}

		it("moves to the next row", () => {
			render(list(["a", "b", "c"], () => {}));
			deleteFocused("a");
			expect(document.activeElement).toBe(screen.getByTestId("b"));
		});

		it("moves to the previous row from the end of the list", () => {
			render(list(["a", "b"], () => {}));
			deleteFocused("b");
			expect(document.activeElement).toBe(screen.getByTestId("a"));
		});

		it("stays put if focus was elsewhere", () => {
			render(
				<>
					<button type="button" data-testid="outside">
						Outside
					</button>
					{list(["a", "b"], () => {})}
				</>,
			);
			const element = screen.getByTestId("a");
			act(() => element.focus());
			fireEvent.keyDown(element, { key: "Delete" });
			act(() => screen.getByTestId("outside").focus());
			act(() => flushFrames());
			finishCollapse();
			expect(document.activeElement).toBe(screen.getByTestId("outside"));
		});
	});
});
