import { describe, expect, test } from "bun:test";
import type { AgentConfig } from "../src/agents.js";
import { runSingleAgent } from "../src/runner.js";

const scout: AgentConfig = {
	name: "scout",
	description: "Fast reconnaissance",
	tools: ["read", "grep"],
	model: "claude-haiku-4-5",
	systemPrompt: "You are scout.",
	source: "user",
	filePath: "/agents/scout.md",
};

describe("single agent runner", () => {
	test("builds Pi JSON invocation and collects output", async () => {
		const calls: any[] = [];
		const result = await runSingleAgent({
			defaultCwd: "/repo",
			agent: scout,
			task: "Find auth code",
			spawn: async (invocation) => {
				calls.push(invocation);
				return {
					exitCode: 0,
					stderr: "",
					stdoutLines: [
						JSON.stringify({
							type: "message_end",
							message: { role: "assistant", content: [{ type: "text", text: "Found auth.ts" }] },
						}),
					],
				};
			},
		});

		expect(calls).toHaveLength(1);
		expect(calls[0].command).toBe("pi");
		expect(calls[0].args).toContain("--mode");
		expect(calls[0].args).toContain("json");
		expect(calls[0].args).toContain("--no-session");
		expect(calls[0].args).toContain("--model");
		expect(calls[0].args).toContain("claude-haiku-4-5");
		expect(calls[0].args).toContain("--tools");
		expect(calls[0].args).toContain("read,grep");
		expect(calls[0].args).toContain("--append-system-prompt");
		expect(calls[0].args.at(-1)).toBe("Task: Find auth code");
		expect(calls[0].cwd).toBe("/repo");
		expect(result.exitCode).toBe(0);
		expect(result.messages).toHaveLength(1);
	});

	test("uses per-task cwd and records stderr/exit code", async () => {
		const result = await runSingleAgent({
			defaultCwd: "/repo",
			cwd: "/repo/packages/app",
			agent: scout,
			task: "Find auth code",
			spawn: async (invocation) => ({ exitCode: invocation.cwd === "/repo/packages/app" ? 7 : 1, stderr: "boom", stdoutLines: [] }),
		});

		expect(result.exitCode).toBe(7);
		expect(result.stderr).toBe("boom");
	});
});
