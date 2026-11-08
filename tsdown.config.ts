import { defineConfig } from "tsdown";

export default defineConfig({
	entry: {
		"react/index": "src/react/index.ts",
	},
	format: "esm",
	// Every part uses hooks, so the whole entry has to be a client module.
	banner: { js: '"use client";' },
	dts: true,
	clean: true,
	publint: true,
	attw: { profile: "esm-only", level: "error" },
});
