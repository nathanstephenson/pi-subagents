# Implementation Plan

## Phase 0 — Decisions to lock

1. Package identity: `pi-subagents` unless renamed.
2. Initial scope: ship Pi package wrapping one extension, sample agents, workflow prompts.
3. Execution strategy: spawn separate `pi --mode json -p --no-session` process per subagent.
4. Supported modes: single, parallel, chain.
5. Agent sources: user agents by default; project agents opt-in.

## Phase 1 — Testable core

- Add `src/agents.ts` with pure discovery functions.
- Add tests for:
  - valid frontmatter parsing
  - missing name/description ignored
  - user/project precedence
  - nearest `.pi/agents` search
- Add `src/modes.ts` with pure param validation.
- Add tests for exactly-one-mode validation, parallel caps, chain placeholder substitution.

## Phase 2 — Runner

- Add `src/runner.ts`.
- Write tests using fake spawned process / event stream parser.
- Parse JSON mode events:
  - assistant `message_end`
  - `tool_result_end`
  - usage aggregation
  - stop/error propagation
- Propagate abort signal to child process.
- Temp-file agent system prompt with `0600` permissions.

## Phase 3 — Extension integration

- Add `src/index.ts` registering `subagent` tool.
- Schema params:
  - single: `agent`, `task`, optional `cwd`
  - parallel: `tasks[]`
  - chain: `chain[]`
  - `agentScope`: `user | project | both`
  - `confirmProjectAgents`
- Add prompt snippets/guidelines so main agent knows when to delegate.

## Phase 4 — TUI rendering

- Add `src/render.ts`.
- Render collapsed status for single/parallel/chain.
- Render expanded task, tool calls, final markdown, usage stats.
- Keep renderer resilient to partial streaming details.

## Phase 5 — Defaults and prompts

- Add sample agents:
  - `scout`
  - `planner`
  - `reviewer`
  - `worker`
- Add workflow prompts:
  - `/scout-and-plan`
  - `/implement`
  - `/implement-and-review`

## Phase 6 — Hardening

- Bound parallel fanout and concurrency.
- Add command to list discovered agents.
- Consider config file for defaults (`.pi/subagents.json` or settings flag).
- Document security model and trusted-project workflow.

## Open questions

1. Should sample agents be bundled/enabled by default, or docs-only examples?
2. Should project agents require confirmation every call, once per session, or once per repo?
3. Should subagents have write access by default, or require explicit `worker` agent?
4. Should runner call current Pi binary or import SDK directly when possible?
5. Should output be complete raw transcript, final answer only, or configurable?
