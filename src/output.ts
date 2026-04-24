import type { Message } from "@mariozechner/pi-ai";

export function getFinalOutput(messages: Message[]): string {
	for (let i = messages.length - 1; i >= 0; i--) {
		const message = messages[i];
		if (message.role !== "assistant") continue;
		for (const part of message.content) {
			if (part.type === "text") return part.text;
		}
	}
	return "";
}
