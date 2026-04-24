import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { discoverAgents, type AgentScope } from "./agents.js";
import { createNodeSpawnPi } from "./node-spawn.js";
import type { RawSubagentRequest } from "./request.js";
import { validateSubagentRequest } from "./request.js";
import { SubagentParamsSchema } from "./schema.js";
import { executeSingleSubagent } from "./tool-executor.js";

export default function registerSubagents(pi: ExtensionAPI) {
	pi.registerCommand("subagents", {
		description: "List discovered subagents",
		handler: async (args, ctx) => {
			const trimmed = args.trim();
			const scope: AgentScope = trimmed === "project" || trimmed === "both" ? trimmed : "user";
			const discovery = discoverAgents(ctx.cwd, scope);
			const lines = discovery.agents.map((agent) => `${agent.name} (${agent.source}): ${agent.description}`);
			ctx.ui.notify(lines.length ? lines.join("\n") : `No agents found for scope: ${scope}`, lines.length ? "info" : "warning");
		},
	});

	pi.registerTool({
		name: "subagent",
		label: "Subagent",
		description: [
			"Delegate tasks to specialized subagents with isolated context.",
			"Current implementation supports single mode: provide agent and task.",
			'Agents are loaded from ~/.pi/agent/agents by default; set agentScope to "project" or "both" to include .pi/agents.',
		].join(" "),
		promptSnippet: "Delegate a bounded task to a named subagent with isolated context",
		promptGuidelines: [
			"Use subagent when a task benefits from isolated context, specialized instructions, or independent investigation.",
			"Use subagent single mode by providing agent and task; parallel and chain modes are planned but not active yet.",
		],
		parameters: SubagentParamsSchema,
		async execute(_toolCallId, params: RawSubagentRequest, signal, _onUpdate, ctx) {
			const validation = validateSubagentRequest(params);
			if (!validation.ok) {
				return { content: [{ type: "text", text: validation.error }], details: { results: [] }, isError: true } as any;
			}

			if (validation.value.mode !== "single") {
				return {
					content: [{ type: "text", text: "Only single mode is implemented in this version. Use agent + task." }],
					details: { results: [] },
					isError: true,
				} as any;
			}

			const discovery = discoverAgents(ctx.cwd, validation.value.agentScope);
			return executeSingleSubagent({
				defaultCwd: ctx.cwd,
				agents: discovery.agents,
				projectAgentsDir: discovery.projectAgentsDir,
				request: validation.value,
				spawn: createNodeSpawnPi(),
				signal,
			});
		},
	});
}
