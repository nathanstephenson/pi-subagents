import type { Message } from "@mariozechner/pi-ai";
import type { AgentSource } from "./agents.js";

export interface UsageStats {
	input: number;
	output: number;
	cacheRead: number;
	cacheWrite: number;
	cost: number;
	contextTokens: number;
	turns: number;
}

export interface SingleRunResult {
	agent: string;
	agentSource: AgentSource | "unknown";
	task: string;
	exitCode: number;
	messages: Message[];
	stderr: string;
	usage: UsageStats;
	model?: string;
	stopReason?: string;
	errorMessage?: string;
	step?: number;
}

export function createRunResult(
	agent: string,
	task: string,
	agentSource: AgentSource | "unknown" = "unknown",
): SingleRunResult {
	return {
		agent,
		agentSource,
		task,
		exitCode: 0,
		messages: [],
		stderr: "",
		usage: {
			input: 0,
			output: 0,
			cacheRead: 0,
			cacheWrite: 0,
			cost: 0,
			contextTokens: 0,
			turns: 0,
		},
	};
}

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

export function ingestPiJsonEvent(
	result: SingleRunResult,
	event: unknown,
): void {
	if (!isObject(event)) return;

	if (event.type === "message_end" && event.message) {
		const message = event.message as Message;
		result.messages.push(message);

		if (message.role === "assistant") {
			result.usage.turns++;
			const usage = message.usage;
			if (usage) {
				result.usage.input += usage.input || 0;
				result.usage.output += usage.output || 0;
				result.usage.cacheRead += usage.cacheRead || 0;
				result.usage.cacheWrite += usage.cacheWrite || 0;
				result.usage.cost += usage.cost?.total || 0;
				result.usage.contextTokens = usage.totalTokens || 0;
			}
			if (message.model) result.model = message.model;
			if (message.stopReason) result.stopReason = message.stopReason;
			if (message.errorMessage) result.errorMessage = message.errorMessage;
		}
	}

	if (event.type === "tool_result_end" && event.message) {
		result.messages.push(event.message as Message);
	}
}
