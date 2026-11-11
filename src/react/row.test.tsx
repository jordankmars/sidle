import { createEvent, fireEvent, render, screen } from "@testing-library/react";
import { StrictMode } from "react";
import { describe, expect, it, vi } from "vitest";
import { Action, Actions, Content, Row } from "./index";
import { finishCollapse, flushFrames } from "./test-setup";

function press(element: Element, x = 100, y = 10) {
	fireEvent.pointerDown(element, {
		button: 0,
		clientX: x,
		clientY: y,
		pointerId: 1,
	});
}
function drag(element: Element, x: number, y = 10) {
	fireEvent.pointerMove(element, { clientX: x, clientY: y, pointerId: 1 });
}
function release(element: Element, x: number, y = 10) {
	fireEvent.pointerUp(element, { clientX: x, clientY: y, pointerId: 1 });
}

function content() {
	return screen.getByTestId("content");
}

describe("Row and Content", () => {
	it("marks the row and sets up the structure swiping relies on", () => {
		render(
			<Row data-testid="row">
				<Content data-testid="content">Hello</Content>
			</Row>,
		);
		const row = screen.getByTestId("row");
		expect(row.hasAttribute("data-sidle-row")).toBe(true);
		expect(row.style.position).toBe("relative");
		expect(row.style.overflow).toBe("hidden");
		expect(content().style.touchAction).toBe("pan-y");
		expect(content().tabIndex).toBe(0);
	});

	it("lets users restyle and forwards refs", () => {
		const rowRef = vi.fn();
		render(
			<Row
				ref={rowRef}
				style={{ overflow: "visible", color: "red" }}
				data-testid="row"
			>
				<Content data-testid="content">Hello</Content>
			</Row>,
		);
		const row = screen.getByTestId("row");
		expect(row.style.overflow).toBe("visible");
		expect(row.style.color).toBe("red");
		expect(rowRef).toHaveBeenCalledWith(row);
	});

	it("throws a useful error outside a Row", () => {
		const error = vi.spyOn(console, "error").mockImplementation(() => {});
		expect(() => render(<Content />)).toThrow("must be inside a Sidle.Row");
		error.mockRestore();
	});

	it("moves the content while dragging and keeps it there through a re-render", () => {
		const tree = (label: string) => (
			<Row>
				<Content data-testid="content" aria-label={label}>
					Hello
				</Content>
			</Row>
		);
		const { rerender } = render(tree("one"));
		press(content());
		drag(content(), 60);
		const painted = content().style.transform;
		expect(painted).toMatch(/^translateX\(-/);
		rerender(tree("two"));
		expect(content().style.transform).toBe(painted);
	});

	it("leaves vertical drags alone", () => {
		render(
			<Row>
				<Content data-testid="content">Hello</Content>
			</Row>,
		);
		press(content());
		drag(content(), 100, 60);
		expect(content().style.transform).toBe("");
	});

	it("ignores buttons other than the primary one", () => {
		render(
			<Row>
				<Content data-testid="content">Hello</Content>
			</Row>,
		);
		fireEvent.pointerDown(content(), {
			button: 2,
			clientX: 100,
			clientY: 10,
			pointerId: 1,
		});
		drag(content(), 60);
		expect(content().style.transform).toBe("");
	});

	it("leaves the leading screen edge alone unless told otherwise", () => {
		const { unmount } = render(
			<Row>
				<Content data-testid="content">Hello</Content>
			</Row>,
		);
		press(content(), 10);
		drag(content(), 60);
		expect(content().style.transform).toBe("");
		unmount();

		render(
			<Row edgeGuard={0}>
				<Content data-testid="content">Hello</Content>
			</Row>,
		);
		press(content(), 10);
		drag(content(), 60);
		expect(content().style.transform).not.toBe("");
	});

	it("reports the phase on the row", () => {
		render(
			<Row data-testid="row">
				<Content data-testid="content">Hello</Content>
			</Row>,
		);
		const row = screen.getByTestId("row");
		expect(row.dataset.phase).toBe("idle");
		press(content());
		drag(content(), 60);
		expect(row.dataset.phase).toBe("dragging");
		release(content(), 60);
		flushFrames();
		expect(row.dataset.phase).toBe("idle");
	});

	describe("the click after a swipe", () => {
		function setup() {
			const onClick = vi.fn();
			render(
				<Row>
					<Content data-testid="content" onClick={onClick}>
						<a href="#inner" data-testid="link">
							Read the full message
						</a>
					</Content>
				</Row>,
			);
			return onClick;
		}

		it("is swallowed, including for links inside the row", () => {
			const onClick = setup();
			press(content());
			drag(content(), 60);
			release(content(), 60);
			const notCancelled = fireEvent.click(screen.getByTestId("link"), {
				detail: 1,
			});
			expect(onClick).not.toHaveBeenCalled();
			expect(notCancelled).toBe(false);
		});

		it("is only swallowed once", () => {
			const onClick = setup();
			press(content());
			drag(content(), 60);
			release(content(), 60);
			fireEvent.click(content(), { detail: 1 });
			fireEvent.click(content(), { detail: 1 });
			expect(onClick).toHaveBeenCalledOnce();
		});

		it("is left alone if it came from the keyboard", () => {
			const onClick = setup();
			press(content());
			drag(content(), 60);
			release(content(), 60);
			fireEvent.click(content(), { detail: 0 });
			expect(onClick).toHaveBeenCalledOnce();
		});

		it("goes through after a plain tap", () => {
			const onClick = setup();
			press(content());
			release(content(), 100);
			fireEvent.click(content(), { detail: 1 });
			expect(onClick).toHaveBeenCalledOnce();
		});
	});

	it("stops native drags of links and images", () => {
		render(
			<Row>
				<Content data-testid="content">Hello</Content>
			</Row>,
		);
		expect(fireEvent.dragStart(content())).toBe(false);
	});

	it("still works after StrictMode's double mount", () => {
		render(
			<StrictMode>
				<Row>
					<Content data-testid="content">Hello</Content>
				</Row>
			</StrictMode>,
		);
		press(content());
		drag(content(), 60);
		expect(content().style.transform).not.toBe("");
	});

	describe("when the pointer leaves the row", () => {
		const onSelect = vi.fn();
		const tree = (
			<Row data-testid="row">
				<Content data-testid="content">Hello</Content>
				<Actions side="end">
					<Action onSelect={onSelect} commit>
						Delete
					</Action>
				</Actions>
			</Row>
		);

		it("follows a flick that's off the row before the drag locks", () => {
			onSelect.mockClear();
			render(tree);
			press(content(), 250);
			drag(document.body, 20);
			expect(content().style.transform).toMatch(/^translateX\(-/);
			release(document.body, 20);
			flushFrames();
			finishCollapse();
			expect(onSelect).toHaveBeenCalledOnce();
		});

		it("drops the gesture if a mouse moves with no button held", () => {
			render(tree);
			press(content(), 250);
			fireEvent.pointerMove(content(), {
				clientX: 100,
				clientY: 10,
				pointerId: 1,
				pointerType: "mouse",
				buttons: 0,
			});
			expect(content().style.transform).toBe("");
			expect(screen.getByTestId("row").dataset.phase).toBe("idle");
		});

		it("keeps a mouse drag going while its button is held", () => {
			render(tree);
			press(content(), 250);
			fireEvent.pointerMove(content(), {
				clientX: 100,
				clientY: 10,
				pointerId: 1,
				pointerType: "mouse",
				buttons: 1,
			});
			expect(content().style.transform).toMatch(/^translateX\(-/);
		});

		describe("commitMomentum", () => {
			function flick(momentum?: number) {
				render(
					<Row data-testid="row" commitMomentum={momentum}>
						<Content data-testid="content">Hello</Content>
						<Actions side="end">
							<Action onSelect={onSelect} commit>
								Delete
							</Action>
						</Actions>
					</Row>,
				);
				press(content(), 250);
				for (const [x, timeStamp] of [
					[200, 1000],
					[130, 1030],
				]) {
					const event = createEvent.pointerMove(content(), {
						clientX: x,
						clientY: 10,
						pointerId: 1,
					});
					Object.defineProperty(event, "timeStamp", { value: timeStamp });
					fireEvent(content(), event);
				}
				release(content(), 130);
				return screen.getByTestId("row");
			}

			it("commits a fast flick early by default", () => {
				expect(flick().dataset.phase).toBe("committing");
			});

			it("goes by distance alone at 0", () => {
				expect(flick(0).dataset.openSide).toBe("end");
			});
		});

		it("stops following once the pointer is released", () => {
			render(tree);
			press(content(), 250);
			release(content(), 250);
			drag(content(), 100);
			expect(content().style.transform).toBe("");
			expect(screen.getByTestId("row").dataset.phase).toBe("idle");
		});
	});
});
