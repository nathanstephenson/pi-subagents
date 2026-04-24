import { describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { discoverAgentsInDirectories } from "../src/agents.js";

function tempDir() {
	return mkdtempSync(join(tmpdir(), "pi-subagents-test-"));
}

describe("agent discovery", () => {
	test("loads valid agent definitions from a directory", () => {
		const dir = tempDir();
		writeFileSync(
			join(dir, "scout.md"),
			`---
name: scout
description: Fast reconnaissance
tools: read, grep, find
model: claude-haiku-4-5
---

Find relevant files and summarize them.
`,
		);

		const agents = discoverAgentsInDirectories([{ dir, source: "user" }]);

		expect(agents).toEqual([
			{
				name: "scout",
				description: "Fast reconnaissance",
				tools: ["read", "grep", "find"],
				model: "claude-haiku-4-5",
				systemPrompt: "Find relevant files and summarize them.",
				source: "user",
				filePath: join(dir, "scout.md"),
			},
		]);
	});

	test("ignores invalid markdown files", () => {
		const dir = tempDir();
		writeFileSync(join(dir, "missing-description.md"), `---\nname: broken\n---\n\nNope.\n`);
		writeFileSync(join(dir, "notes.txt"), "not an agent");

		expect(discoverAgentsInDirectories([{ dir, source: "user" }])).toEqual([]);
	});

	test("later directories override earlier directories by agent name", () => {
		const userDir = tempDir();
		const projectDir = tempDir();
		writeFileSync(join(userDir, "worker.md"), `---\nname: worker\ndescription: User worker\n---\n\nUser prompt.\n`);
		writeFileSync(join(projectDir, "worker.md"), `---\nname: worker\ndescription: Project worker\n---\n\nProject prompt.\n`);

		const agents = discoverAgentsInDirectories([
			{ dir: userDir, source: "user" },
			{ dir: projectDir, source: "project" },
		]);

		expect(agents).toHaveLength(1);
		expect(agents[0].description).toBe("Project worker");
		expect(agents[0].source).toBe("project");
	});
});
