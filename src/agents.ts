import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { getAgentDir, parseFrontmatter } from "@mariozechner/pi-coding-agent";

export type AgentSource = "user" | "project";
export type AgentScope = "user" | "project" | "both";

export interface AgentConfig {
	name: string;
	description: string;
	tools?: string[];
	model?: string;
	systemPrompt: string;
	source: AgentSource;
	filePath: string;
}

export interface AgentDirectory {
	dir: string;
	source: AgentSource;
}

export interface AgentDiscoveryOptions {
	userAgentsDir?: string;
}

export interface AgentDiscoveryResult {
	agents: AgentConfig[];
	projectAgentsDir: string | null;
}

type AgentFrontmatter = Record<string, unknown> & {
	name?: string;
	description?: string;
	tools?: string;
	model?: string;
};

function loadAgentsFromDirectory({ dir, source }: AgentDirectory): AgentConfig[] {
	if (!existsSync(dir)) return [];

	let entries;
	try {
		entries = readdirSync(dir, { withFileTypes: true });
	} catch {
		return [];
	}

	const agents: AgentConfig[] = [];
	for (const entry of entries) {
		if (!entry.name.endsWith(".md")) continue;
		if (!entry.isFile() && !entry.isSymbolicLink()) continue;

		const filePath = join(dir, entry.name);
		let content: string;
		try {
			content = readFileSync(filePath, "utf8");
		} catch {
			continue;
		}

		const { frontmatter, body } = parseFrontmatter<AgentFrontmatter>(content);
		if (!frontmatter.name || !frontmatter.description) continue;

		const tools = frontmatter.tools
			?.split(",")
			.map((tool) => tool.trim())
			.filter(Boolean);

		agents.push({
			name: frontmatter.name,
			description: frontmatter.description,
			tools: tools && tools.length > 0 ? tools : undefined,
			model: frontmatter.model,
			systemPrompt: body,
			source,
			filePath,
		});
	}

	return agents;
}

export function discoverAgentsInDirectories(directories: AgentDirectory[]): AgentConfig[] {
	const byName = new Map<string, AgentConfig>();
	for (const directory of directories) {
		for (const agent of loadAgentsFromDirectory(directory)) {
			byName.set(agent.name, agent);
		}
	}
	return Array.from(byName.values());
}

function isDirectory(path: string): boolean {
	try {
		return existsSync(path) && readdirSync(path, { withFileTypes: true }) !== undefined;
	} catch {
		return false;
	}
}

export function findNearestProjectAgentsDir(cwd: string): string | null {
	let current = cwd;
	while (true) {
		const candidate = join(current, ".pi", "agents");
		if (isDirectory(candidate)) return candidate;

		const parent = dirname(current);
		if (parent === current) return null;
		current = parent;
	}
}

export function discoverAgents(
	cwd: string,
	scope: AgentScope = "user",
	options: AgentDiscoveryOptions = {},
): AgentDiscoveryResult {
	const userAgentsDir = options.userAgentsDir ?? join(getAgentDir(), "agents");
	const projectAgentsDir = findNearestProjectAgentsDir(cwd);
	const directories: AgentDirectory[] = [];

	if (scope === "user" || scope === "both") directories.push({ dir: userAgentsDir, source: "user" });
	if ((scope === "project" || scope === "both") && projectAgentsDir) {
		directories.push({ dir: projectAgentsDir, source: "project" });
	}

	return {
		agents: discoverAgentsInDirectories(directories),
		projectAgentsDir,
	};
}
