import { describe, expect, test } from "bun:test";
import { createNodeSpawnPi } from "../src/node-spawn.js";

describe("Node spawn adapter", () => {
	test("runs a process and returns stdout lines, stderr, and exit code", async () => {
		const spawnPi = createNodeSpawnPi("bun", ["--eval"]);

		const result = await spawnPi({
			command: "ignored",
			args: ["console.log('one'); console.log('two'); console.error('err')"],
			cwd: process.cwd(),
		});

		expect(result.exitCode).toBe(0);
		expect(result.stdoutLines).toEqual(["one", "two"]);
		expect(result.stderr).toContain("err");
	});
});
