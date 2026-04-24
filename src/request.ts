import type { AgentScope } from "./agents.js";

export const MAX_PARALLEL_TASKS = 8;

export interface TaskRequest {
	agent: string;
	task: string;
	cwd?: string;
}

export interface RawSubagentRequest {
	agent?: string;
	task?: string;
	cwd?: string;
	tasks?: TaskRequest[];
	chain?: TaskRequest[];
	agentScope?: AgentScope;
	confirmProjectAgents?: boolean;
}

export type ValidSubagentRequest =
	| (TaskRequest & { mode: "single"; agentScope: AgentScope; confirmProjectAgents: boolean })
	| { mode: "parallel"; tasks: TaskRequest[]; agentScope: AgentScope; confirmProjectAgents: boolean };

export type ValidationResult = { ok: true; value: ValidSubagentRequest } | { ok: false; error: string };

export function validateSubagentRequest(params: RawSubagentRequest): ValidationResult {
	const hasSingle = Boolean(params.agent && params.task);
	const hasParallel = Boolean(params.tasks?.length);
	const hasChain = Boolean(params.chain?.length);

	if (hasChain) {
		return {
			ok: false,
			error: "Chain mode is not supported. Let the main agent inspect each result and decide the next delegation.",
		};
	}

	const modeCount = Number(hasSingle) + Number(hasParallel);

	if (modeCount !== 1) {
		return { ok: false, error: "Provide exactly one mode: single (agent + task), parallel (tasks), or chain (chain)." };
	}

	const common = {
		agentScope: params.agentScope ?? "user",
		confirmProjectAgents: params.confirmProjectAgents ?? true,
	};

	if (hasSingle) {
		return {
			ok: true,
			value: { mode: "single", ...common, agent: params.agent!, task: params.task!, cwd: params.cwd },
		};
	}

	if (hasParallel) {
		if (params.tasks!.length > MAX_PARALLEL_TASKS) {
			return { ok: false, error: `Too many parallel tasks (${params.tasks!.length}). Max is ${MAX_PARALLEL_TASKS}.` };
		}
		return { ok: true, value: { mode: "parallel", ...common, tasks: params.tasks! } };
	}

	return { ok: false, error: "Unreachable validation state." };
}
