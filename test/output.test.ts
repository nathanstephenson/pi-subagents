import { describe, expect, test } from "bun:test";
import type { Message } from "@mariozechner/pi-ai";
import { getFinalOutput } from "../src/output.js";

describe("subagent output helpers", () => {
	test("returns last assistant text", () => {
		const messages: Message[] = [
			{
				role: "assistant",
				content: [{ type: "text", text: "First" }],
				timestamp: 1,
				api: "test",
				provider: "test",
				model: "test",
				usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } },
				stopReason: "stop",
			},
			{
				role: "assistant",
				content: [{ type: "text", text: "Second" }],
				timestamp: 2,
				api: "test",
				provider: "test",
				model: "test",
				usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } },
				stopReason: "stop",
			},
		];

		expect(getFinalOutput(messages)).toBe("Second");
	});

	test("returns empty string when no assistant text exists", () => {
		expect(getFinalOutput([])).toBe("");
	});
});
