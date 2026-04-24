import { describe, expect, test } from "bun:test";
import type { AgentConfig } from "../src/agents.js";
import { findRequestedProjectAgents, shouldConfirmProjectAgents } from "../src/project-agent-approval.js";

const userScout: AgentConfig = {
	name: "scout",
	description: "User scout",
	systemPrompt: "Scout",
	source: "user",
	filePath: "/user/scout.md",
};

const projectWorker: AgentConfig = {
	name: "worker",
	description: "Project worker",
	systemPrompt: "Worker",
	source: "project",
	filePath: "/repo/.pi/agents/worker.md",
};

describe("project agent approval", () => {
	test("finds requested project agents", () => {
		const projectAgents = findRequestedProjectAgents([userScout, projectWorker], ["scout", "worker", "missing"]);

		expect(projectAgents).toEqual([projectWorker]);
	});

	test("requires confirmation only when enabled and project agents are requested", () => {
		expect(shouldConfirmProjectAgents({ agentScope: "both", confirmProjectAgents: true, hasUI: true, projectAgentCount: 1 })).toBe(true);
		expect(shouldConfirmProjectAgents({ agentScope: "user", confirmProjectAgents: true, hasUI: true, projectAgentCount: 1 })).toBe(false);
		expect(shouldConfirmProjectAgents({ agentScope: "both", confirmProjectAgents: false, hasUI: true, projectAgentCount: 1 })).toBe(false);
		expect(shouldConfirmProjectAgents({ agentScope: "both", confirmProjectAgents: true, hasUI: false, projectAgentCount: 1 })).toBe(false);
		expect(shouldConfirmProjectAgents({ agentScope: "both", confirmProjectAgents: true, hasUI: true, projectAgentCount: 0 })).toBe(false);
	});
});
