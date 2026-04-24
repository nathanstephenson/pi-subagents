# pi-subagents

Pi package that adds a `subagent` tool for delegating tasks to isolated Pi subprocesses.

## Goal

Let the main agent spawn specialized agents with narrow system prompts, tool sets, model choices, and isolated context windows.

## Features

- Single subagent delegation: `{ agent, task }`
- Parallel delegation for independent tasks: `{ tasks: [{ agent, task }, ...] }`
- User agents from `~/.pi/agent/agents/*.md`
- Optional project agents from nearest `.pi/agents/*.md`
- Confirmation before running project-local agents in interactive sessions
- Sample agents included as copyable examples; they are not auto-loaded

## Package shape

```text
pi-subagents/
├── src/                  # Pi extension source
├── agents/               # Sample agent definitions; copy these into Pi agent dirs to use
├── prompts/              # Workflow prompt templates
└── test/                 # Bun tests
```

## Install from a local checkout

Clone or download this repo somewhere on your machine, then point Pi at that directory.

Example one-off test run:

```bash
pi -e /path/to/your/checkouts/pi-subagents
```

Example persistent local install:

```bash
pi install /path/to/your/checkouts/pi-subagents
```

Example project-local install for a team repo:

```bash
cd /path/to/team/repo
pi install -l /path/to/your/checkouts/pi-subagents
```

Replace `/path/to/your/checkouts/pi-subagents` with the actual path to your local checkout. After changing package code, use `/reload` inside Pi.

## Install from GitHub

```bash
pi install git:github.com/nathanstephenson/pi-subagents
```

Pinned ref/tag:

```bash
pi install git:github.com/nathanstephenson/pi-subagents@v0.1.0
```

## Install sample agents

Sample agents are examples only. Copy the ones you want into your Pi agent directory.

User-level agents:

```bash
mkdir -p ~/.pi/agent/agents
cp /path/to/your/checkouts/pi-subagents/agents/scout.md ~/.pi/agent/agents/
cp /path/to/your/checkouts/pi-subagents/agents/planner.md ~/.pi/agent/agents/
cp /path/to/your/checkouts/pi-subagents/agents/reviewer.md ~/.pi/agent/agents/
cp /path/to/your/checkouts/pi-subagents/agents/worker.md ~/.pi/agent/agents/
```

Project-level agents:

```bash
cd /path/to/team/repo
mkdir -p .pi/agents
cp /path/to/your/checkouts/pi-subagents/agents/scout.md .pi/agents/
```

Project agents are repo-controlled and require opt-in via `agentScope: "project"` or `agentScope: "both"`.

## Usage

List discovered user agents:

```text
/subagents
```

List project agents too:

```text
/subagents both
```

Ask the main agent to delegate:

```text
Use the scout subagent to find authentication code.
```

For independent work, ask for parallel delegation:

```text
Run scout in parallel on the API layer and database layer, then summarize the differences.
```

## Agent definition format

```md
---
name: scout
description: Fast repo reconnaissance; returns compact findings.
tools: read, grep, find, ls, bash
model: claude-haiku-4-5
---

System prompt for scout agent.
```

`tools` and `model` are optional. If omitted, the subagent uses Pi defaults.

## Security stance

- User agents from `~/.pi/agent/agents/*.md` load by default.
- Project agents from nearest `.pi/agents/*.md` require opt-in.
- Interactive runs confirm before executing project-controlled agents.
- Subagents inherit filesystem/process permissions of the Pi process.

## Development

```bash
bun install
bun test
bun run typecheck
```
