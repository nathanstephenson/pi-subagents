import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

export default function registerSubagents(pi: ExtensionAPI) {
	pi.registerCommand("subagents", {
		description: "Show pi-subagents planning status",
		handler: async (_args, ctx) => {
			ctx.ui.notify("pi-subagents scaffold loaded. Tool implementation pending.", "info");
		},
	});
}
