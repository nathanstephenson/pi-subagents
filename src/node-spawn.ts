import { spawn } from "node:child_process";
import type { SpawnPi, SpawnResult } from "./runner.js";

export function createNodeSpawnPi(commandOverride?: string, prefixArgs: string[] = []): SpawnPi {
	return (invocation) => {
		return new Promise<SpawnResult>((resolve) => {
			const command = commandOverride ?? invocation.command;
			const args = [...prefixArgs, ...invocation.args];
			const child = spawn(command, args, {
				cwd: invocation.cwd,
				stdio: ["ignore", "pipe", "pipe"],
				shell: false,
			});

			let stdout = "";
			let stderr = "";

			child.stdout.on("data", (chunk) => {
				stdout += chunk.toString();
			});
			child.stderr.on("data", (chunk) => {
				stderr += chunk.toString();
			});

			child.on("error", (error) => {
				stderr += error.message;
				resolve({ exitCode: 1, stderr, stdoutLines: stdout.split("\n").filter((line) => line.length > 0) });
			});

			child.on("close", (code) => {
				resolve({ exitCode: code ?? 0, stderr, stdoutLines: stdout.split("\n").filter((line) => line.length > 0) });
			});

			if (invocation.signal) {
				const abort = () => child.kill("SIGTERM");
				if (invocation.signal.aborted) abort();
				else invocation.signal.addEventListener("abort", abort, { once: true });
			}
		});
	};
}
