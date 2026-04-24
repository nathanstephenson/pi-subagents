import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseFrontmatter } from "@mariozechner/pi-coding-agent";

export type AgentSource = "user" | "project";

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
