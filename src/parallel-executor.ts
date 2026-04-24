import type { AgentToolResult } from "@mariozechner/pi-agent-core";
import type { AgentConfig } from "./agents.js";
import { getFinalOutput } from "./output.js";
import type { ValidSubagentRequest } from "./request.js";
import type { SingleRunResult } from "./result-collector.js";
import { runSingleAgent, type SpawnPi } from "./runner.js";
import type { SubagentDetails } from "./tool-executor.js";

const MAX_CONCURRENCY = 4;

export interface ExecuteParallelSubagentsOptions {
	defaultCwd: string;
	agents: AgentConfig[];
	projectAgentsDir?: string | null;
	request: Extract<ValidSubagentRequest, { mode: "parallel" }>;
	spawn: SpawnPi;
	signal?: AbortSignal;
}

function textResult(
	text: string,
	details: SubagentDetails,
	isError?: boolean,
): AgentToolResult<SubagentDetails> {
	return {
		content: [{ type: "text", text }],
		details,
		...(isError ? { isError: true } : {}),
	};
}

async function mapWithConcurrency<T, U>(
	items: T[],
	concurrency: number,
	fn: (item: T, index: number) => Promise<U>,
): Promise<U[]> {
	const results = new Array<U>(items.length);
	let nextIndex = 0;
	const workers = Array.from(
		{ length: Math.min(concurrency, items.length) },
		async () => {
			while (true) {
				const index = nextIndex++;
				if (index >= items.length) return;
				results[index] = await fn(items[index], index);
			}
		},
	);
	await Promise.all(workers);
	return results;
}

export async function executeParallelSubagents(
	options: ExecuteParallelSubagentsOptions,
): Promise<AgentToolResult<SubagentDetails>> {
	const details = (results: SingleRunResult[]): SubagentDetails => ({
		mode: "parallel",
		agentScope: options.request.agentScope,
		projectAgentsDir: options.projectAgentsDir ?? null,
		results,
	});

	for (const task of options.request.tasks) {
		if (!options.agents.some((agent) => agent.name === task.agent)) {
			const available =
				options.agents.map((agent) => `"${agent.name}"`).join(", ") || "none";
			return textResult(
				`Unknown agent: "${task.agent}". Available agents: ${available}.`,
				details([]),
				true,
			);
		}
	}

	const agentByName = new Map(
		options.agents.map((agent) => [agent.name, agent]),
	);
	const results = await mapWithConcurrency(
		options.request.tasks,
		MAX_CONCURRENCY,
		async (task) => {
			const agent = agentByName.get(task.agent);
			if (!agent)
				throw new Error(`Unknown agent after validation: ${task.agent}`);
			return runSingleAgent({
				defaultCwd: options.defaultCwd,
				cwd: task.cwd,
				agent,
				task: task.task,
				spawn: options.spawn,
				signal: options.signal,
			});
		},
	);

	const successCount = results.filter(
		(result) =>
			result.exitCode === 0 &&
			result.stopReason !== "error" &&
			result.stopReason !== "aborted",
	).length;
	const summaries = results.map((result) => {
		const output = getFinalOutput(result.messages);
		const preview = output.length > 120 ? `${output.slice(0, 120)}...` : output;
		return `[${result.agent}] ${result.exitCode === 0 ? "completed" : "failed"}: ${preview || result.stderr || "(no output)"}`;
	});

	const hasError = successCount !== results.length;
	return textResult(
		`Parallel: ${successCount}/${results.length} succeeded\n\n${summaries.join("\n\n")}`,
		details(results),
		hasError,
	);
}
