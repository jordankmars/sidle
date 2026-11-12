import { highlight } from "@/lib/highlight";
import { InstallTabs } from "./install-tabs";

const COMMANDS = [
	["pnpm", "pnpm add tuckaway"],
	["npm", "npm install tuckaway"],
	["yarn", "yarn add tuckaway"],
	["bun", "bun add tuckaway"],
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
