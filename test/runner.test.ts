import { describe, expect, test } from "bun:test";
import type { AgentConfig } from "../src/agents.js";
import {
	type NestedSessionsHost,
	type PiInvocation,
	runSingleAgent,
} from "../src/runner.js";

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
	test("uses nested session host instead of spawning Pi when available", async () => {
		let spawnCalled = false;
		const started: unknown[] = [];
		const host: NestedSessionsHost = {
			async startNestedSession(input) {
				started.push(input);
				return { id: "nested-1" };
			},
			async *streamNestedSession(id) {
				expect(id).toBe("nested-1");
				yield {
					nestedSessionId: id,
					status: "done",
					summary: "Found auth.ts",
					completedAt: "2026-06-12T00:00:00.000Z",
				};
			},
		};

		const result = await runSingleAgent({
			defaultCwd: "/repo",
			cwd: "/repo/packages/app",
			agent: scout,
			task: "Find auth code",
			nestedSessions: host,
			spawn: async () => {
				spawnCalled = true;
				return { exitCode: 1, stderr: "should not spawn", stdoutLines: [] };
			},
		});

		expect(spawnCalled).toBe(false);
		expect(started).toEqual([
			{
				agentName: "scout",
				task: "Find auth code",
				cwd: "/repo/packages/app",
				model: "claude-haiku-4-5",
				tools: ["read", "grep"],
				systemPrompt: "You are scout.",
				metadata: {
					agentSource: "user",
					agentFilePath: "/agents/scout.md",
				},
			},
		]);
		expect(result.exitCode).toBe(0);
		expect(result.messages[0]?.role).toBe("assistant");
		expect(result.messages[0]?.content).toEqual([
			{ type: "text", text: "Found auth.ts" },
		]);
	});

	test("host path with aborted signal before start does not start child or spawn", async () => {
		let spawnCalled = false;
		let startCalled = false;
		const controller = new AbortController();
		controller.abort();

		const result = await runSingleAgent({
			defaultCwd: "/repo",
			agent: scout,
			task: "Find auth code",
			signal: controller.signal,
			nestedSessions: {
				async startNestedSession() {
					startCalled = true;
					return { id: "nested-1" };
				},
				async *streamNestedSession() {},
			},
			spawn: async () => {
				spawnCalled = true;
				return { exitCode: 1, stderr: "should not spawn", stdoutLines: [] };
			},
		});

		expect(startCalled).toBe(false);
		expect(spawnCalled).toBe(false);
		expect(result.exitCode).toBe(1);
		expect(result.stopReason).toBe("cancelled");
		expect(result.errorMessage).toBe("Subagent run cancelled.");
	});

	test("host path abort during stream cancels child and exits non-zero", async () => {
		const controller = new AbortController();
		const cancelled: string[] = [];
		let resumeStream: (() => void) | undefined;

		const resultPromise = runSingleAgent({
			defaultCwd: "/repo",
			agent: scout,
			task: "Find auth code",
			signal: controller.signal,
			nestedSessions: {
				async startNestedSession() {
					return { id: "nested-1" };
				},
				async *streamNestedSession() {
					await new Promise<void>((resolve) => {
						resumeStream = resolve;
					});
				},
				async cancelNestedSession(id) {
					cancelled.push(id);
					resumeStream?.();
				},
			},
			spawn: async () => ({ exitCode: 1, stderr: "should not spawn", stdoutLines: [] }),
		});

		await new Promise((resolve) => setTimeout(resolve, 0));
		controller.abort();
		const result = await resultPromise;

		expect(cancelled).toEqual(["nested-1"]);
		expect(result.exitCode).toBe(1);
		expect(result.stopReason).toBe("cancelled");
		expect(result.errorMessage).toBe("Subagent run cancelled.");
	});

	test("builds Pi JSON invocation and collects output", async () => {
		const calls: PiInvocation[] = [];
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
							message: {
								role: "assistant",
								content: [{ type: "text", text: "Found auth.ts" }],
							},
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
			spawn: async (invocation) => ({
				exitCode: invocation.cwd === "/repo/packages/app" ? 7 : 1,
				stderr: "boom",
				stdoutLines: [],
			}),
		});

		expect(result.exitCode).toBe(7);
		expect(result.stderr).toBe("boom");
	});
});
