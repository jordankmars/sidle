import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		passWithNoTests: true,
		projects: [
			{
				test: {
					name: "core",
					include: ["src/core/**/*.test.ts"],
					environment: "node",
				},
			},
			{
				test: {
					name: "react",
					include: ["src/react/**/*.test.{ts,tsx}"],
					environment: "jsdom",
					setupFiles: ["src/react/test-setup.ts"],
				},
			},
		],
	},
});
