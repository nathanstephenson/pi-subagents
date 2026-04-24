import { describe, expect, test } from "bun:test";
import { validateSubagentRequest } from "../src/request.js";

describe("subagent request validation", () => {
	test("accepts single mode and applies defaults", () => {
		const result = validateSubagentRequest({
			agent: "scout",
			task: "Find auth code",
		});

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value).toEqual({
				mode: "single",
				agentScope: "user",
				confirmProjectAgents: true,
				agent: "scout",
				task: "Find auth code",
			});
		}
	});

	test("rejects requests without exactly one mode", () => {
		expect(validateSubagentRequest({}).ok).toBe(false);
		expect(
			validateSubagentRequest({
				agent: "scout",
				task: "x",
				tasks: [{ agent: "planner", task: "y" }],
			}).ok,
		).toBe(false);
	});

	test("rejects chain mode because orchestration belongs to the main agent", () => {
		expect(
			validateSubagentRequest({
				chain: [{ agent: "scout", task: "Find auth" }],
			}),
		).toEqual({
			ok: false,
			error:
				"Chain mode is not supported. Let the main agent inspect each result and decide the next delegation.",
		});
	});

	test("rejects too many parallel tasks", () => {
		const tasks = Array.from({ length: 9 }, (_, index) => ({
			agent: "scout",
			task: `Task ${index}`,
		}));

		const result = validateSubagentRequest({ tasks });

		expect(result).toEqual({
			ok: false,
			error: "Too many parallel tasks (9). Max is 8.",
		});
	});
});
