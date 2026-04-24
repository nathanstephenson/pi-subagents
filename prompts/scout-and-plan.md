Use subagents to scout and plan this request:

{{args}}

Orchestrator-first flow:
1. Call `subagent` with `agent: "scout"` and a bounded reconnaissance task.
2. Inspect the scout result yourself.
3. Call `subagent` with `agent: "planner"` and include the relevant scout findings in the planner task.
4. Return the plan, risks, tests, and open questions to the user.
