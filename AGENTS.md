# Project Agent Instructions

After making any code, test, config, or documentation change, run Biome before handing off:

```bash
bunx --bun @biomejs/biome check --write .
```

Then run the standard validation suite:

```bash
bun test
bun run typecheck
```
