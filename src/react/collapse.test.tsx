import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Action, Actions, Content, Row } from "./index";
import {
	finishCollapse,
	flushFrames,
	runningAnimations,
	setReducedMotion,
} from "./test-setup";

const content = () => screen.getByTestId("content");

function fullSwipe() {
	const point = { clientY: 10, pointerId: 1 };
	fireEvent.pointerDown(content(), { ...point, button: 0, clientX: 280 });
	fireEvent.pointerMove(content(), { ...point, clientX: 60 });
	fireEvent.pointerUp(content(), { ...point, clientX: 60 });
}

function RemovableList() {
	const [rows, setRows] = useState(["a"]);
	return rows.map((row) => (
		<Row key={row} value={row}>
			<Content data-testid="content">Hello</Content>
			<Actions side="end">
				<Action onSelect={() => setRows([])} commit>
					Delete
				</Action>
			</Actions>
		</Row>
	));
}

function setup(onSelect = vi.fn()) {
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
	return { ...render(tree), onSelect };
}

describe("collapsing after a commit", () => {
	it("waits for the slide and the collapse before running the action", () => {
		const { onSelect } = setup();
		fullSwipe();
		expect(runningAnimations()).toHaveLength(0);
		flushFrames();
		expect(runningAnimations()).toHaveLength(1);
		expect(onSelect).not.toHaveBeenCalled();
		finishCollapse();
		expect(onSelect).toHaveBeenCalledOnce();
	});

	it("collapses the row and holds it there until it's removed", () => {
		setup();
		fullSwipe();
		flushFrames();
		const [animation] = runningAnimations();
		expect(animation.element).toBe(screen.getByTestId("row"));
		expect(animation.options.fill).toBe("forwards");
		expect(animation.options.duration).toBe(220);
	});

	it("barely animates for reduced motion", () => {
		setReducedMotion(true);
		setup();
		fullSwipe();
		flushFrames();
		expect(runningAnimations()[0].options.duration).toBe(1);
	});

	it("runs the action once if the row unmounts during the slide", () => {
		const { onSelect, unmount } = setup();
		fullSwipe();
		unmount();
		expect(onSelect).toHaveBeenCalledOnce();
		expect(runningAnimations()).toHaveLength(0);
	});

	it("runs the action once if the row unmounts during the collapse", () => {
		const { onSelect, unmount } = setup();
		fullSwipe();
		flushFrames();
		unmount();
		expect(onSelect).toHaveBeenCalledOnce();
		finishCollapse();
		expect(onSelect).toHaveBeenCalledOnce();
	});

	it("removes the row when the action takes it out of the list", () => {
		render(<RemovableList />);
		fullSwipe();
		flushFrames();
		expect(content()).toBeTruthy();
		finishCollapse();
		expect(screen.queryByTestId("content")).toBeNull();
	});
});
