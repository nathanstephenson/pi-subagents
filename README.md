# pi-subagents

Pi package that adds a `subagent` tool for delegating tasks to isolated Pi subprocesses.

## Goal

Let main agent spawn specialized agents with narrow system prompts, tool sets, model choices, and isolated context windows.

## Planned package shape

```text
pi-subagents/
├── src/
│   ├── index.ts          # Pi extension entrypoint; registers subagent tool + commands
│   ├── agents.ts         # Agent discovery + frontmatter parsing
│   ├── runner.ts         # Pi subprocess invocation + JSON event parsing
│   ├── modes.ts          # single / parallel / chain orchestration
│   └── render.ts         # TUI call/result rendering
├── agents/               # Optional sample agents
├── prompts/              # Optional workflow prompts
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

## Install from GitHub after publishing

```bash
pi install git:github.com/nathanstephenson/pi-subagents
```

Pinned ref/tag:

```bash
pi install git:github.com/nathanstephenson/pi-subagents@v0.1.0
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

## Security stance

- User agents from `~/.pi/agent/agents/*.md` load by default.
- Project agents from nearest `.pi/agents/*.md` require opt-in.
- Interactive runs confirm before executing project-controlled agents.
- Subagents inherit filesystem/process permissions of Pi process.

## Status

Planning scaffold created. Implementation should follow TDD: write tests for discovery/orchestration before filling modules.
