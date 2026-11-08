import { describe, expect, it } from "vitest";
import { createSwipeGroup } from "./group";
import { createSwipeMachine } from "./machine";

function row() {
	const m = createSwipeMachine({ reducedMotion: true });
	m.setLayout({
		rowWidth: 380,
		start: { width: 90 },
		end: { width: 150, commit: true },
	});
	return m;
}

describe("createSwipeGroup", () => {
	it("tracks which row is open", () => {
		const group = createSwipeGroup();
		const a = row();
		group.register("a", a);
		expect(group.openId).toBeNull();
		a.open("end");
		expect(group.openId).toBe("a");
		a.close();
		expect(group.openId).toBeNull();
	});

	it("closes the open row when another one opens", () => {
		const group = createSwipeGroup();
		const a = row();
		const b = row();
		group.register("a", a);
		group.register("b", b);
		a.open("end");
		b.open("start");
		expect(a.getState().openSide).toBeNull();
		expect(b.getState().openSide).toBe("start");
		expect(group.openId).toBe("b");
	});

	it("closes the open row as soon as another one is grabbed", () => {
		const group = createSwipeGroup();
		const a = row();
		const b = row();
		group.register("a", a);
		group.register("b", b);
		a.open("end");
		b.down({ x: 200, y: 0, time: 0 });
		expect(a.getState().openSide).toBe("end");
		b.move({ x: 180, y: 0, time: 16 });
		expect(a.getState().openSide).toBeNull();
	});

	it("closes everything, or everything but one", () => {
		const group = createSwipeGroup();
		const a = row();
		group.register("a", a);
		a.open("end");
		group.closeAll("a");
		expect(a.getState().openSide).toBe("end");
		group.closeAll();
		expect(a.getState().openSide).toBeNull();
		expect(group.openId).toBeNull();
	});

	it("forgets a committed row", () => {
		const group = createSwipeGroup();
		const a = row();
		group.register("a", a);
		a.commit("end");
		expect(group.openId).toBeNull();
	});

	it("stops managing a row once it is removed", () => {
		const group = createSwipeGroup();
		const a = row();
		const b = row();
		const removeA = group.register("a", a);
		group.register("b", b);
		a.open("end");
		removeA();
		b.open("end");
		expect(a.getState().openSide).toBe("end");
	});

	it("reopens a row that comes back after being unmounted", () => {
		const group = createSwipeGroup();
		const first = row();
		const remove = group.register("a", first);
		first.open("start");
		first.destroy();
		remove();
		expect(group.openId).toBe("a");

		const second = row();
		group.register("a", second);
		expect(second.getState()).toMatchObject({ offset: 90, openSide: "start" });
	});

	it("forgets an unmounted row once another row opens", () => {
		const group = createSwipeGroup();
		const a = row();
		const removeA = group.register("a", a);
		a.open("end");
		removeA();
		const b = row();
		group.register("b", b);
		b.open("end");

		const again = row();
		group.register("a", again);
		expect(again.getState().openSide).toBeNull();
		expect(group.openId).toBe("b");
	});

	it("forgets an unmounted row when everything is closed", () => {
		const group = createSwipeGroup();
		const a = row();
		const removeA = group.register("a", a);
		a.open("end");
		removeA();
		group.closeAll();
		expect(group.openId).toBeNull();
	});
});
