// Framework-agnostic core. Internal: not exported on its own.

export type { FrameLoop, FrameScheduler, Tickable } from "./loop";
export { createFrameLoop } from "./loop";
export type {
	Phase,
	Point,
	SwipeLayout,
	SwipeMachine,
	SwipeMachineOptions,
	SwipeState,
} from "./machine";
export { createSwipeMachine, DEFAULT_SPRING } from "./machine";
export type { Side, SideConfig, Sides } from "./sides";
export type { SpringConfig } from "./spring";
