import type { AgentToolResult } from "@mariozechner/pi-agent-core";
import type { AgentConfig, AgentScope } from "./agents.js";
import { getFinalOutput } from "./output.js";
import type { ValidSubagentRequest } from "./request.js";
import type { SingleRunResult } from "./result-collector.js";
import {
	type NestedSessionsHost,
	runSingleAgent,
	type SpawnPi,
} from "./runner.js";

export interface SubagentDetails {
	mode: "single" | "parallel";
	agentScope: AgentScope;
	projectAgentsDir: string | null;
	results: SingleRunResult[];
}

export interface ExecuteSingleSubagentOptions {
	defaultCwd: string;
	agents: AgentConfig[];
	projectAgentsDir?: string | null;
	request: Extract<ValidSubagentRequest, { mode: "single" }>;
	spawn: SpawnPi;
	signal?: AbortSignal;
	nestedSessions?: NestedSessionsHost;
}

function makeResult(
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

export async function executeSingleSubagent(
	options: ExecuteSingleSubagentOptions,
): Promise<AgentToolResult<SubagentDetails>> {
	const details = (results: SingleRunResult[]): SubagentDetails => ({
		mode: "single",
		agentScope: options.request.agentScope,
		projectAgentsDir: options.projectAgentsDir ?? null,
		results,
	});

	const agent = options.agents.find(
		(candidate) => candidate.name === options.request.agent,
	);
	if (!agent) {
		const available =
			options.agents.map((candidate) => `"${candidate.name}"`).join(", ") ||
			"none";
		return makeResult(
			`Unknown agent: "${options.request.agent}". Available agents: ${available}.`,
			details([]),
			true,
		);
	}

	const result = await runSingleAgent({
		defaultCwd: options.defaultCwd,
		cwd: options.request.cwd,
		agent,
		task: options.request.task,
		spawn: options.spawn,
		signal: options.signal,
		nestedSessions: options.nestedSessions,
	});

	const isError =
		result.exitCode !== 0 ||
		result.stopReason === "error" ||
		result.stopReason === "aborted";
	if (isError) {
		const errorOutput =
			result.errorMessage ||
			result.stderr ||
			getFinalOutput(result.messages) ||
			"(no output)";
		return makeResult(
			`Agent ${result.stopReason || "failed"}: ${errorOutput}`,
			details([result]),
			true,
		);
	}

	return makeResult(
		getFinalOutput(result.messages) || "(no output)",
		details([result]),
	);
}
