# Current OmniCode Orchestration Model

OmniCode uses **single-writer orchestration**.

The short version:

> The primary `omnicode` agent owns active-worktree writes and decisions. Optional subagents contribute intelligence only. They do not become parallel developers.

This document explains how the current system works for users and future maintainers.

## Why this model exists

Parallel writer agents are tempting, but they fragment implicit decisions: style, edge cases, tests, architecture, and product interpretation. OmniCode instead keeps one coherent writer and injects extra intelligence around that writer.

The current model is designed to get the practical benefits of multi-agent work without reintroducing unstructured swarms:

- more codebase discovery without bloating the primary context
- stronger plan critique before implementation
- clean-context review before commit
- one owner for scope, edits, verification, commits, and PR decisions

## The primary `omnicode` agent

The primary agent is the orchestrator and the only normal active-worktree writer.

It owns:

- user clarification
- collaboration/branch checkpoint decisions
- skill-fit decisions
- `.omni/` planning artifacts
- implementation slices
- source edits in the active worktree
- verification decisions
- clean-context review adjudication
- commits and PR decisions

When in doubt, the primary agent decides what becomes an action.

## Optional native subagents

Native subagents are optional and configured through `/omni-agents`. This is a configuration surface for intelligence helpers; it does not enable parallel writer mode.

Settings live outside durable project memory:

- global: `~/.omnicode/settings.json`
- project override: `.omnicode/settings.json` — gitignored by default

Optional model guidance can live in `model-recommendations.md` next to either settings file.

Subagents report back to the primary agent. They do not commit, make final decisions, or own scope.

### `omni-explorer`

Purpose: read-only discovery.

Use it for:

- finding relevant files
- inspecting code paths
- summarizing existing patterns
- identifying risks and open questions

Expected output is a discovery packet:

```md
## Findings
- ...

## Evidence
- `path/to/file.ts:42` — relevant behavior

## Risks / edge cases
- ...

## Open questions
- ...

## Suggested next inspection
- ...
```

It must not edit files, run mutating commands, or continue into implementation.

### `omni-planner`

Purpose: read-only planning and smart-friend critique.

Use it for:

- critiquing a plan
- spotting missing context
- identifying edge cases and non-goals
- suggesting test strategy
- advising whether the task needs more user clarification

It should say what the primary agent needs to inspect next instead of guessing when context is missing.

It must not edit files or write planning artifacts directly. The primary agent writes final planning updates.

### `omni-verifier`

Purpose: verification and clean-context review.

Use it for:

- running planned checks when requested
- inspecting failures
- reviewing the current diff/tests with fresh context
- reporting blockers before commit

It must not edit source, relax tests, commit, or decide scope. It reports findings so the primary agent can adjudicate them.

### `omni-worker`

`omni-worker` exists for compatibility with the current optional subagent configuration surface, but it is **not** part of the intended normal workflow.

Do not use it as a casual writer subagent. Do not run parallel worker swarms in the active worktree.

The current intended workflow does not require using `omni-worker`. Its presence does not mean branch/worktree-backed writer mode exists or should be implemented. The primary agent remains responsible for all active-worktree writes, verification decisions, and commits.

## Clean-context review

Use `/clean-context-review` before committing meaningful implementation changes when an explicit review loop is useful.

The command is review/adjudication-only by default. It should not edit files or commit.

It supports two modes:

- **Blind diff review** — default. Review the diff and test output with minimal prior assumptions.
- **Contract review** — compare the diff against the active spec, tasks, tests, non-goals, and user constraints.

The review reports findings by severity, evidence, suggested fix, confidence, and whether each finding blocks commit.

Then the primary agent adjudicates each finding:

- **accepted** — fix before commit, then rerun verification
- **rejected** — record why it is a false positive, out of scope, or intentionally deferred
- **needs-user** — ask before changing behavior

## Commit flow

The intended implementation loop is:

```text
clarify
check skills
plan
implement one bounded slice
run planned checks
run or account for clean-context review
adjudicate findings
fix accepted findings
rerun verification
commit
```

The `/commit` command reminds agents to run `/clean-context-review` or explicitly confirm that clean-context review was already completed and adjudicated for meaningful implementation changes.

## What is intentionally not implemented

OmniCode does **not** implement branch/worktree-backed writer workers.

That idea would mean spawning a subagent that writes code in its own branch or worktree and then asking the primary agent to synthesize its changes later. It is safer than shared-worktree writer swarms, but it is still a writer-subagent model.

Current guidance is to avoid implementing it. The practical system is:

- one active writer
- optional read-only scouts
- optional smart-friend planning critique
- optional clean-context verifier/reviewer
- primary-agent adjudication and commits

If future users ask for large multi-PR delegation, revisit the design explicitly. Until then, do not add writer-subagent orchestration.

## User commands

- `/omni-agents` — inspect or configure optional native subagents.
- `/clean-context-review` — run a review/adjudication pass over current changes before commit.
- `/commit` — verify, account for clean-context review, stage, and commit ready changes.

## Maintainer checklist

When changing orchestration behavior, preserve these invariants:

- The primary `omnicode` agent is the active-worktree writer by default.
- Subagents contribute intelligence and report back.
- Reviewers do not edit or commit.
- `omni-worker` is not promoted as a normal path.
- No unstructured multi-agent writer swarms.
- No branch/worktree-backed writer mode unless a future design explicitly reopens that decision.
