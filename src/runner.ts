import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AgentConfig } from "./agents.js";
import {
	createRunResult,
	ingestPiJsonEvent,
	type SingleRunResult,
} from "./result-collector.js";

export interface PiInvocation {
	command: string;
	args: string[];
	cwd: string;
	signal?: AbortSignal;
}

export interface SpawnResult {
	exitCode: number;
	stderr: string;
	stdoutLines: string[];
}

export type SpawnPi = (invocation: PiInvocation) => Promise<SpawnResult>;

export interface RunSingleAgentOptions {
	defaultCwd: string;
	cwd?: string;
	agent: AgentConfig;
	task: string;
	step?: number;
	signal?: AbortSignal;
	spawn: SpawnPi;
}

function writeSystemPromptTempFile(
	agentName: string,
	systemPrompt: string,
): { dir: string; filePath: string } {
	const dir = mkdtempSync(join(tmpdir(), "pi-subagents-"));
	const safeAgentName = agentName.replace(/[^\w.-]+/g, "_");
	const filePath = join(dir, `system-${safeAgentName}.md`);
	writeFileSync(filePath, systemPrompt, { encoding: "utf8", mode: 0o600 });
	return { dir, filePath };
}

export async function runSingleAgent(
	options: RunSingleAgentOptions,
): Promise<SingleRunResult> {
	const result = createRunResult(
		options.agent.name,
		options.task,
		options.agent.source,
	);
	result.model = options.agent.model;
	result.step = options.step;

	const args = ["--mode", "json", "-p", "--no-session"];
	if (options.agent.model) args.push("--model", options.agent.model);
	if (options.agent.tools?.length)
		args.push("--tools", options.agent.tools.join(","));

	let tmpDir: string | undefined;
	if (options.agent.systemPrompt.trim()) {
		const tmp = writeSystemPromptTempFile(
			options.agent.name,
			options.agent.systemPrompt,
		);
		tmpDir = tmp.dir;
		args.push("--append-system-prompt", tmp.filePath);
	}
	args.push(`Task: ${options.task}`);

	try {
		const spawned = await options.spawn({
			command: "pi",
			args,
			cwd: options.cwd ?? options.defaultCwd,
			signal: options.signal,
		});

		result.exitCode = spawned.exitCode;
		result.stderr = spawned.stderr;
		for (const line of spawned.stdoutLines) {
			if (!line.trim()) continue;
			try {
				ingestPiJsonEvent(result, JSON.parse(line));
			} catch {
				// Ignore non-JSON subprocess output.
			}
		}
		return result;
	} finally {
		if (tmpDir) rmSync(tmpDir, { recursive: true, force: true });
	}
}
