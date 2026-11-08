/** Logical edge of a row. `start` is the left edge in left-to-right layouts. */
export type Side = "start" | "end";

export interface SideConfig {
	/** Width in px the row opens to when this side's actions are revealed. */
	width: number;
	/** Whether a full swipe on this side commits its main action. */
	commit?: boolean;
}

export type Sides = Partial<Record<Side, SideConfig>>;

/** +1 if revealing the side moves content right, -1 if it moves it left. */
export type Sign = 1 | -1;
