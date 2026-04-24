import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { discoverAgents, type AgentScope } from "./agents.js";
import { createNodeSpawnPi } from "./node-spawn.js";
import { executeParallelSubagents } from "./parallel-executor.js";
import { findRequestedProjectAgents, getRequestedAgentNames, shouldConfirmProjectAgents } from "./project-agent-approval.js";
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
			"Supports single mode (agent + task) and parallel mode (tasks array).",
			'Agents are loaded from ~/.pi/agent/agents by default; set agentScope to "project" or "both" to include .pi/agents.',
		].join(" "),
		promptSnippet: "Delegate a bounded task to a named subagent with isolated context",
		promptGuidelines: [
			"Use subagent when a task benefits from isolated context, specialized instructions, or independent investigation.",
			"Use subagent parallel mode for independent investigations; let the main agent inspect results before delegating follow-up work.",
		],
		parameters: SubagentParamsSchema,
		async execute(_toolCallId, params: RawSubagentRequest, signal, _onUpdate, ctx) {
			const validation = validateSubagentRequest(params);
			if (!validation.ok) {
				return { content: [{ type: "text", text: validation.error }], details: { results: [] }, isError: true } as any;
			}

			const discovery = discoverAgents(ctx.cwd, validation.value.agentScope);
			const projectAgents = findRequestedProjectAgents(discovery.agents, getRequestedAgentNames(validation.value));
			if (
				shouldConfirmProjectAgents({
					agentScope: validation.value.agentScope,
					confirmProjectAgents: validation.value.confirmProjectAgents,
					hasUI: ctx.hasUI,
					projectAgentCount: projectAgents.length,
				})
			) {
				const names = projectAgents.map((agent) => agent.name).join(", ");
				const ok = await ctx.ui.confirm(
					"Run project-local subagents?",
					`Agents: ${names}\nSource: ${discovery.projectAgentsDir ?? "(unknown)"}\n\nProject agents are repo-controlled. Continue only for trusted repositories.`,
				);
				if (!ok) {
					return {
						content: [{ type: "text", text: "Canceled: project-local subagents not approved." }],
						details: { results: [] },
						isError: true,
					} as any;
				}
			}

			const spawn = createNodeSpawnPi();
			if (validation.value.mode === "parallel") {
				return executeParallelSubagents({
					defaultCwd: ctx.cwd,
					agents: discovery.agents,
					projectAgentsDir: discovery.projectAgentsDir,
					request: validation.value,
					spawn,
					signal,
				});
			}

			return executeSingleSubagent({
				defaultCwd: ctx.cwd,
				agents: discovery.agents,
				projectAgentsDir: discovery.projectAgentsDir,
				request: validation.value,
				spawn,
				signal,
			});
		},
	});
}
