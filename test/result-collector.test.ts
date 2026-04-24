import { describe, expect, test } from "bun:test";
import type { Message } from "@mariozechner/pi-ai";
import { createRunResult, ingestPiJsonEvent } from "../src/result-collector.js";

describe("Pi JSON result collector", () => {
	test("collects assistant messages and usage from message_end events", () => {
		const result = createRunResult("scout", "Find auth", "user");

		ingestPiJsonEvent(result, {
			type: "message_end",
			message: {
				role: "assistant",
				content: [{ type: "text", text: "Found auth.ts" }],
				model: "claude-haiku-4-5",
				stopReason: "stop",
				usage: {
					input: 100,
					output: 20,
					cacheRead: 5,
					cacheWrite: 2,
					cost: { total: 0.0012 },
					totalTokens: 120,
				},
			},
		});

		expect(result.messages).toHaveLength(1);
		expect(result.usage).toEqual({ input: 100, output: 20, cacheRead: 5, cacheWrite: 2, cost: 0.0012, contextTokens: 120, turns: 1 });
		expect(result.model).toBe("claude-haiku-4-5");
		expect(result.stopReason).toBe("stop");
	});

	test("collects tool result messages", () => {
		const result = createRunResult("scout", "Find auth", "user");
		const message: Message = {
			role: "toolResult",
			content: [{ type: "text", text: "file contents" }],
			toolCallId: "call-1",
			toolName: "read",
			isError: false,
			timestamp: 123,
		};

		ingestPiJsonEvent(result, { type: "tool_result_end", message });

		expect(result.messages).toEqual([message]);
	});

	test("ignores invalid or unrelated events", () => {
		const result = createRunResult("scout", "Find auth", "user");

		ingestPiJsonEvent(result, { type: "message_start" });
		ingestPiJsonEvent(result, null);

		expect(result.messages).toEqual([]);
	});
});
