import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const manifest = JSON.parse(
	readFileSync(join(import.meta.dir, "..", "package.json"), "utf8"),
);

describe("package scaffold", () => {
	test("declares pi extension entrypoint", () => {
		expect(manifest.pi.extensions).toContain("./src/index.ts");
	});
});
