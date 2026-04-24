import type { AgentConfig, AgentScope } from "./agents.js";

export interface ShouldConfirmProjectAgentsOptions {
	agentScope: AgentScope;
	confirmProjectAgents: boolean;
	hasUI: boolean;
	projectAgentCount: number;
}

export function findRequestedProjectAgents(agents: AgentConfig[], requestedAgentNames: string[]): AgentConfig[] {
	const requested = new Set(requestedAgentNames);
	return agents.filter((agent) => agent.source === "project" && requested.has(agent.name));
}

export function shouldConfirmProjectAgents(options: ShouldConfirmProjectAgentsOptions): boolean {
	return (
		options.hasUI &&
		options.confirmProjectAgents &&
		(options.agentScope === "project" || options.agentScope === "both") &&
		options.projectAgentCount > 0
	);
}
