import { describe, expect, test } from "bun:test";
import type { AgentConfig } from "../src/agents.js";
import { executeParallelSubagents } from "../src/parallel-executor.js";

const agents: AgentConfig[] = [
	{ name: "scout", description: "Scout", systemPrompt: "Scout", source: "user", filePath: "/agents/scout.md" },
	{ name: "planner", description: "Planner", systemPrompt: "Planner", source: "user", filePath: "/agents/planner.md" },
];

describe("parallel subagent executor", () => {
	test("runs tasks and preserves request order", async () => {
		const result = await executeParallelSubagents({
			defaultCwd: "/repo",
			agents,
			request: {
				mode: "parallel",
				agentScope: "user",
				confirmProjectAgents: true,
				tasks: [
					{ agent: "scout", task: "Find auth" },
					{ agent: "planner", task: "Plan auth" },
				],
			},
			spawn: async (invocation) => ({
				exitCode: 0,
				stderr: "",
				stdoutLines: [
					JSON.stringify({
						type: "message_end",
						message: { role: "assistant", content: [{ type: "text", text: invocation.args.at(-1) }] },
					}),
				],
			}),
		});

		expect((result as any).isError).toBeUndefined();
		expect(result.details.results.map((run) => run.agent)).toEqual(["scout", "planner"]);
		expect(result.content[0].type).toBe("text");
		if (result.content[0].type === "text") expect(result.content[0].text).toContain("Parallel: 2/2 succeeded");
	});

	test("returns error when any task references an unknown agent", async () => {
		const result = await executeParallelSubagents({
			defaultCwd: "/repo",
			agents,
			request: {
				mode: "parallel",
				agentScope: "user",
				confirmProjectAgents: true,
				tasks: [{ agent: "missing", task: "Do work" }],
			},
			spawn: async () => ({ exitCode: 0, stderr: "", stdoutLines: [] }),
		});

		expect((result as any).isError).toBe(true);
		expect(result.content[0].type).toBe("text");
		if (result.content[0].type === "text") expect(result.content[0].text).toContain('Unknown agent: "missing"');
	});
});
