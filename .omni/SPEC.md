# Spec

## Problem

The omnicode agent should always operate in Omni mode, auto-bootstrap new projects, use RTK for token savings, and provide `/commit` and `/push` slash commands that follow conventional commit style and handle push failures gracefully.

## Requested Behavior

1. **Omni mode always on** + **auto-bootstrap**: done.
2. **RTK integration**: done — plugin rewrites bash commands through RTK when available.
3. **`/commit` command**: review local changes, stage, and create a descriptive conventional commit. Follow strict conventional commit style (`feat:`, `fix:`, `refactor:`, etc.). Do not push.
4. **`/push` command**: push the current branch. If it fails, diagnose, make minimum safe fixes, and retry. Non-destructive — no force-push, no history rewriting unless clearly necessary.
5. **Conventional commits everywhere**: the omnicode agent should default to conventional commit style for all commits, not just `/commit`.

## Constraints

- `/push` must be non-destructive and graceful. If the issue can't be resolved safely, stop and explain.
- No `run`/`handoff` pre-execution mechanism available in OpenCode commands — the agent itself handles the push-and-retry loop.
- Commands are `.md` files in `packages/plugin/src/resources/commands/` with frontmatter.

## Success Criteria

- `/commit` command available, produces conventional commits
- `/push` command available, handles failures gracefully
- Agent instructions mention conventional commit style as the default
- Existing tests still pass
