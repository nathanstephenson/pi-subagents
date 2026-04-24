import { StringEnum } from "@mariozechner/pi-ai";
import { Type } from "typebox";

const TaskItem = Type.Object({
	agent: Type.String({ description: "Name of the agent to invoke" }),
	task: Type.String({ description: "Task to delegate to the agent" }),
	cwd: Type.Optional(Type.String({ description: "Working directory for the agent process" })),
});

export const SubagentParamsSchema = Type.Object({
	agent: Type.Optional(Type.String({ description: "Name of the agent to invoke (single mode)" })),
	task: Type.Optional(Type.String({ description: "Task to delegate (single mode)" })),
	cwd: Type.Optional(Type.String({ description: "Working directory for the agent process (single mode)" })),
	tasks: Type.Optional(Type.Array(TaskItem, { description: "Parallel tasks to run concurrently" })),
	agentScope: Type.Optional(
		StringEnum(["user", "project", "both"] as const, {
			description: 'Agent directories to use. Default: "user".',
			default: "user",
		}),
	),
	confirmProjectAgents: Type.Optional(
		Type.Boolean({ description: "Prompt before running project-local agents. Default: true.", default: true }),
	),
});
