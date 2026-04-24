import { describe, expect, test } from "bun:test";
import type { AgentConfig } from "../src/agents.js";
import { executeSingleSubagent } from "../src/tool-executor.js";

const scout: AgentConfig = {
	name: "scout",
	description: "Fast reconnaissance",
	systemPrompt: "Scout prompt",
	source: "user",
	filePath: "/agents/scout.md",
};

describe("subagent tool executor", () => {
	test("runs known single agent and returns final output", async () => {
		const result = await executeSingleSubagent({
			defaultCwd: "/repo",
			agents: [scout],
			request: { mode: "single", agentScope: "user", confirmProjectAgents: true, agent: "scout", task: "Find auth" },
			spawn: async () => ({
				exitCode: 0,
				stderr: "",
				stdoutLines: [JSON.stringify({ type: "message_end", message: { role: "assistant", content: [{ type: "text", text: "Found auth.ts" }] } })],
			}),
		});

		expect((result as any).isError).toBeUndefined();
		expect(result.content).toEqual([{ type: "text", text: "Found auth.ts" }]);
		expect(result.details.results[0].agent).toBe("scout");
	});

	test("returns helpful error for unknown agent", async () => {
		const result = await executeSingleSubagent({
			defaultCwd: "/repo",
			agents: [scout],
			request: { mode: "single", agentScope: "user", confirmProjectAgents: true, agent: "planner", task: "Plan" },
			spawn: async () => ({ exitCode: 0, stderr: "", stdoutLines: [] }),
		});

		expect((result as any).isError).toBe(true);
		expect(result.content[0].type).toBe("text");
		if (result.content[0].type === "text") {
			expect(result.content[0].text).toContain('Unknown agent: "planner"');
			expect(result.content[0].text).toContain('"scout"');
		}
	});
});
