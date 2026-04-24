import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { discoverAgents, findNearestProjectAgentsDir } from "../src/agents.js";

function tempDir() {
	return mkdtempSync(join(tmpdir(), "pi-subagents-discover-test-"));
}

function writeAgent(
	dir: string,
	name: string,
	description = `${name} description`,
) {
	mkdirSync(dir, { recursive: true });
	writeFileSync(
		join(dir, `${name}.md`),
		`---\nname: ${name}\ndescription: ${description}\n---\n\n${name} prompt`,
	);
}

describe("discoverAgents", () => {
	test("finds nearest project agents directory by walking upward from cwd", () => {
		const root = tempDir();
		const nested = join(root, "packages", "app", "src");
		mkdirSync(nested, { recursive: true });
		mkdirSync(join(root, ".pi", "agents"), { recursive: true });

		expect(findNearestProjectAgentsDir(nested)).toBe(
			join(root, ".pi", "agents"),
		);
	});

	test("uses user agents by default", () => {
		const cwd = tempDir();
		const userAgentsDir = join(tempDir(), "agents");
		writeAgent(userAgentsDir, "scout");
		writeAgent(join(cwd, ".pi", "agents"), "project-only");

		const result = discoverAgents(cwd, "user", { userAgentsDir });

		expect(result.projectAgentsDir).toBe(join(cwd, ".pi", "agents"));
		expect(result.agents.map((agent) => agent.name)).toEqual(["scout"]);
	});

	test("project scope loads only project agents", () => {
		const cwd = tempDir();
		const userAgentsDir = join(tempDir(), "agents");
		writeAgent(userAgentsDir, "user-only");
		writeAgent(join(cwd, ".pi", "agents"), "project-only");

		const result = discoverAgents(cwd, "project", { userAgentsDir });

		expect(result.agents.map((agent) => agent.name)).toEqual(["project-only"]);
	});

	test("both scope lets project agents override user agents", () => {
		const cwd = tempDir();
		const userAgentsDir = join(tempDir(), "agents");
		writeAgent(userAgentsDir, "worker", "User worker");
		writeAgent(join(cwd, ".pi", "agents"), "worker", "Project worker");

		const result = discoverAgents(cwd, "both", { userAgentsDir });

		expect(result.agents).toHaveLength(1);
		expect(result.agents[0].description).toBe("Project worker");
	});
});
