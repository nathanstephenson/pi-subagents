import { describe, expect, test } from "bun:test";
import type { AgentToolResult } from "@mariozechner/pi-agent-core";
import type { AgentConfig } from "../src/agents.js";
import {
	executeSingleSubagent,
	type SubagentDetails,
} from "../src/tool-executor.js";

type ToolResultWithError = AgentToolResult<SubagentDetails> & {
	isError?: boolean;
};

const scout: AgentConfig = {
	name: "scout",
	description: "Fast reconnaissance",
	systemPrompt: "Scout prompt",
	source: "user",
	filePath: "/agents/scout.md",
};

describe("subagent tool executor", () => {
	test("passes nested session host to single agent runner", async () => {
		let spawnCalled = false;
		const result = await executeSingleSubagent({
			defaultCwd: "/repo",
			agents: [scout],
			request: {
				mode: "single",
				agentScope: "user",
				confirmProjectAgents: true,
				agent: "scout",
				task: "Find auth",
			},
			nestedSessions: {
				async startNestedSession() {
					return { id: "nested-1" };
				},
				async *streamNestedSession(id) {
					yield {
						nestedSessionId: id,
						status: "done",
						summary: "Host result",
					};
				},
			},
			spawn: async () => {
				spawnCalled = true;
				return { exitCode: 1, stderr: "should not spawn", stdoutLines: [] };
			},
		});

		expect(spawnCalled).toBe(false);
		expect(result.content).toEqual([{ type: "text", text: "Host result" }]);
	});

	test("runs known single agent and returns final output", async () => {
		const result = await executeSingleSubagent({
			defaultCwd: "/repo",
			agents: [scout],
			request: {
				mode: "single",
				agentScope: "user",
				confirmProjectAgents: true,
				agent: "scout",
				task: "Find auth",
			},
			spawn: async () => ({
				exitCode: 0,
				stderr: "",
				stdoutLines: [
					JSON.stringify({
						type: "message_end",
						message: {
							role: "assistant",
							content: [{ type: "text", text: "Found auth.ts" }],
						},
					}),
				],
			}),
		});

		expect((result as ToolResultWithError).isError).toBeUndefined();
		expect(result.content).toEqual([{ type: "text", text: "Found auth.ts" }]);
		expect(result.details.results[0].agent).toBe("scout");
	});

	test("returns helpful error for unknown agent", async () => {
		const result = await executeSingleSubagent({
			defaultCwd: "/repo",
			agents: [scout],
			request: {
				mode: "single",
				agentScope: "user",
				confirmProjectAgents: true,
				agent: "planner",
				task: "Plan",
			},
			spawn: async () => ({ exitCode: 0, stderr: "", stdoutLines: [] }),
		});

		expect((result as ToolResultWithError).isError).toBe(true);
		expect(result.content[0].type).toBe("text");
		if (result.content[0].type === "text") {
			expect(result.content[0].text).toContain('Unknown agent: "planner"');
			expect(result.content[0].text).toContain('"scout"');
		}
	});
});
