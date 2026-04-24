# Publishing

## Local validation

```bash
bun install
bun test
bun run typecheck
pi -e .
```

Inside Pi, run:

```text
/subagents
```

Expected: notification that scaffold loaded.

## GitHub publishing checklist

1. Create GitHub repo: `nathan/pi-subagents` (or update `package.json` URLs first).
2. Push local repo.
3. Install from GitHub:

```bash
pi install git:github.com/nathanstephenson/pi-subagents
```

4. Test in any repo:

```bash
pi
/reload
/subagents
```

## Release tags

Use semver tags once behavior works:

```bash
v0.1.0
```

Pinned install:

```bash
pi install git:github.com/nathanstephenson/pi-subagents@v0.1.0
```

## npm later

This package is shaped for npm too, but initial target is GitHub/local install.
If publishing to npm later, verify package name availability and decide whether to scope it.
