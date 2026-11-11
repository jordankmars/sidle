import { highlight } from "@/lib/highlight";
import { InstallTabs } from "./install-tabs";

const COMMANDS = [
	["pnpm", "pnpm add sidle"],
	["npm", "npm install sidle"],
	["yarn", "yarn add sidle"],
	["bun", "bun add sidle"],
] as const;

export async function Install() {
	const commands = await Promise.all(
		COMMANDS.map(async ([manager, code]) => ({
			manager,
			code,
			html: await highlight(code, "sh"),
		})),
	);
	return <InstallTabs commands={commands} />;
}
