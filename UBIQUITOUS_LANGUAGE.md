# Ubiquitous Language

## Subagent delegation

| Term | Definition | Aliases to avoid |
| --- | --- | --- |
| **Main Agent** | The active Pi coding agent that receives user prompts and may delegate work. | Parent agent, primary agent |
| **Subagent** | An isolated Pi process assigned a specific delegated task. | Worker bot, child model |
| **Agent Definition** | A markdown file with frontmatter describing a subagent's name, tools, model, and system prompt. | Agent config, persona file |
| **Delegated Task** | A bounded instruction given by the Main Agent to one Subagent. | Job, prompt |
| **Agent Scope** | The set of locations used to discover Agent Definitions. | Source, namespace |
| **User Agent** | An Agent Definition stored in the user's global Pi agent directory. | Global agent |
| **Project Agent** | An Agent Definition stored in a repository's `.pi/agents` directory. | Local agent, repo agent |
| **Workflow Prompt** | A reusable slash prompt that coordinates one or more Subagents for a common flow. | Preset, recipe |
| **Chain Mode** | Sequential Subagent execution where later tasks can consume prior output. | Pipeline, sequence |
| **Parallel Mode** | Concurrent Subagent execution for independent Delegated Tasks. | Fanout, swarm |

## Relationships

- A **Main Agent** may create zero or more **Subagents**.
- A **Subagent** executes exactly one **Delegated Task** per invocation.
- An **Agent Definition** defines one named **Subagent**.
- **Agent Scope** includes **User Agents**, **Project Agents**, or both.
- A **Workflow Prompt** may use **Chain Mode**, **Parallel Mode**, or both.

## Example dialogue

> **Dev:** "Should the **Main Agent** inspect the repo itself or delegate?"
> **Domain expert:** "Use a **Subagent** when the work benefits from isolated context or specialization."
> **Dev:** "Where does that Subagent get its behavior?"
> **Domain expert:** "From an **Agent Definition**. If it comes from `.pi/agents`, it is a **Project Agent** and needs trust handling."
> **Dev:** "For implementation, should scout and planner run at same time?"
> **Domain expert:** "Only independent **Delegated Tasks** use **Parallel Mode**. Scout-to-planner should use **Chain Mode**."

## Flagged ambiguities

- "plugin" means Pi package containing an extension; canonical term: **Pi Package** for distribution, **Extension** for runtime code.
- "agent" can mean **Main Agent**, **Subagent**, or **Agent Definition**; qualify it in docs and code names.
