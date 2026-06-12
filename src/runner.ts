import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Message } from "@mariozechner/pi-ai";
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

export type NestedSessionTerminalStatus = "done" | "error" | "cancelled";

export interface StartNestedSessionInput {
	agentName: string;
	task: string;
	cwd?: string;
	model?: string;
	tools?: string[];
	systemPrompt?: string;
	metadata?: Record<string, unknown>;
}

export interface NestedSessionLink {
	id: string;
}

export interface NestedSessionResult {
	nestedSessionId: string;
	status: NestedSessionTerminalStatus;
	summary: string;
	completedAt?: string;
	error?: string;
}

export type NestedSessionStreamEvent =
	| NestedSessionResult
	| Record<string, unknown>;

export interface NestedSessionsHost {
	startNestedSession(input: StartNestedSessionInput): Promise<NestedSessionLink>;
	streamNestedSession(id: string): AsyncIterable<NestedSessionStreamEvent>;
	cancelNestedSession?(id: string): Promise<void>;
	getNestedTranscript?(id: string): Promise<string>;
	answerNestedInput?(inputRequestId: string, answer: string): Promise<void>;
}

export interface RunSingleAgentOptions {
	defaultCwd: string;
	cwd?: string;
	agent: AgentConfig;
	task: string;
	step?: number;
	signal?: AbortSignal;
	spawn: SpawnPi;
	nestedSessions?: NestedSessionsHost;
}

function isNestedSessionResult(
	event: NestedSessionStreamEvent,
): event is NestedSessionResult {
	return (
		typeof event === "object" &&
		event !== null &&
		"status" in event &&
		(event.status === "done" ||
			event.status === "error" ||
			event.status === "cancelled")
	);
}

function assistantTextMessage(text: string): Message {
	return {
		role: "assistant",
		content: [{ type: "text", text }],
	} as Message;
}

async function runNestedSession(
	options: RunSingleAgentOptions,
	result: SingleRunResult,
): Promise<SingleRunResult> {
	if (!options.nestedSessions) return result;
	if (options.signal?.aborted) return markCancelled(result);
	const cwd = options.cwd ?? options.defaultCwd;
	const link = await options.nestedSessions.startNestedSession({
		agentName: options.agent.name,
		task: options.task,
		cwd,
		model: options.agent.model,
		tools: options.agent.tools,
		systemPrompt: options.agent.systemPrompt,
		metadata: {
			agentSource: options.agent.source,
			agentFilePath: options.agent.filePath,
		},
	});

	let abortListener: (() => void) | undefined;
	let abortPromise: Promise<"aborted"> | undefined;
	if (options.signal) {
		abortPromise = new Promise<"aborted">((resolve) => {
			abortListener = () => resolve("aborted");
			options.signal?.addEventListener("abort", abortListener, { once: true });
		});
	}

	try {
		if (options.signal?.aborted) {
			await options.nestedSessions.cancelNestedSession?.(link.id);
			return markCancelled(result);
		}

		const iterator = options.nestedSessions.streamNestedSession(link.id)[
			Symbol.asyncIterator
		]();
		while (true) {
			const next = iterator.next();
			const settled = abortPromise
				? await Promise.race([next, abortPromise])
				: await next;
			if (settled === "aborted") {
				await options.nestedSessions.cancelNestedSession?.(link.id);
				await iterator.return?.();
				return markCancelled(result);
			}
			if (settled.done) break;
			if (!isNestedSessionResult(settled.value)) continue;
			result.exitCode = settled.value.status === "done" ? 0 : 1;
			result.stopReason =
				settled.value.status === "done" ? "stop" : settled.value.status;
			if (settled.value.status !== "done") {
				result.stderr = settled.value.error ?? settled.value.summary;
				result.errorMessage = settled.value.error ?? settled.value.summary;
			}
			result.messages.push(assistantTextMessage(settled.value.summary));
			return result;
		}
	} finally {
		if (options.signal && abortListener) {
			options.signal.removeEventListener("abort", abortListener);
		}
	}

	result.exitCode = 1;
	result.stopReason = "error";
	result.stderr = "Nested Session ended without a terminal result.";
	result.errorMessage = result.stderr;
	return result;
}

function markCancelled(result: SingleRunResult): SingleRunResult {
	result.exitCode = 1;
	result.stopReason = "cancelled";
	result.stderr = "Subagent run cancelled.";
	result.errorMessage = result.stderr;
	return result;
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

	if (options.nestedSessions) return runNestedSession(options, result);

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
