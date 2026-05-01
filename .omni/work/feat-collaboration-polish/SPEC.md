# Spec

## Problem

OmniCode now enforces clarification, skill-fit, branch-scoped planning, verification, and commits, but it does not yet encode several engineering-practice workflows that improve implementation quality inside each slice. Matt Pocock's public skills highlight useful patterns for TDD, disciplined diagnosis, documentation-aware clarification, and architecture review. OmniCode should adapt those concepts into versioned, tested, OmniCode-native workflow resources.

## Requested Behavior

Implement bundled OmniCode workflow support for:

1. **TDD implementation discipline**
   - Add a bundled `tdd` workflow skill.
   - Route feature work, bug fixes with clear seams, behavior changes, and behavior-preserving refactors toward TDD during skill suggestion/skill-fit.
   - Instruct agents to use TDD as a workflow requirement in planning and verification, not as a brittle tool-level source-edit guard.
   - Treat the active planning directory's `TESTS.md` as the place to record TDD applicability, behavior under test, public seam/interface, red/green/refactor evidence, and verification commands. Root `.omni/TESTS.md` remains a legacy fallback.

2. **Diagnose bug workflow**
   - Add a bundled `diagnose` workflow skill for bugs, failing behavior, and performance regressions.
   - Route unknown failures through diagnose first: build/reuse a feedback loop, reproduce, minimize, hypothesize, instrument, fix, and regression-test.
   - Use TDD inside diagnose only once a reproducible loop or valid regression seam exists.

3. **Documentation-aware grill variant**
   - Add a bundled `grill-with-docs` skill as an enhanced variant, not a replacement for `grill-me`.
   - Use it when clarification exposes domain language, durable decisions, ADR-worthy tradeoffs, or reusable project context.
   - Keep normal `grill-me` as the default lightweight clarification gate.

4. **Architecture review workflow command**
   - Add an `improve-codebase-architecture` workflow skill and a user-triggered command.
   - The command should inspect docs/code and produce numbered deepening opportunities; it must not refactor automatically.
   - If the user selects a candidate, refactoring becomes a normal Omni change request with spec/tasks/tests and verification.

## Constraints

- Adapt concepts into bundled OmniCode resources; do not install or depend on external skills at runtime.
- Keep OpenCode as the host; no custom shell behavior.
- Preserve existing public tool names and existing workflow guard semantics.
- Keep TDD/diagnose enforcement instruction- and planning-based rather than trying to infer true red/green cycles at tool level.
- Update `CHANGELOG.md` with each committed slice.
- Verify each slice with `npm run check` and `npm test` before committing.

## Success Criteria

- Bundled/default skills include `tdd`, `diagnose`, `grill-with-docs`, and `improve-codebase-architecture` as they land.
- `omnicode_suggest_skills` suggests:
  - `tdd` for feature/behavior/refactor/test-first requests,
  - `diagnose` for bugs/failures/performance regressions,
  - `grill-with-docs` for ADR/domain/documentation-aware planning,
  - `improve-codebase-architecture` for architecture/deepening/refactor-opportunity requests.
- Agent instructions describe the new routing and planning expectations, including active-work `TESTS.md` terminology.
- `/improve-codebase-architecture` is available as a command and is review/planning-only by default.
- README/AGENTS/CHANGELOG document the new workflow behavior.
- Tests cover bundled skill listing/reading, default skill memory, suggestion heuristics, and command registration where applicable.
- `npm run check` and `npm test` pass after each slice.

---

## Current Implementation Task — OpenCode Target Version Update

### Problem

OmniCode's launcher pins the managed upstream OpenCode runtime target at `1.14.25`, while npm reports the latest `opencode-ai` version as `1.14.30`. New OmniCode-managed installs should use the latest tested OpenCode runtime without changing OmniCode's own package version.

### Requested Behavior

- Update the launcher OpenCode target version from `1.14.25` to `1.14.30`.
- Keep OmniCode package versions at `0.3.0`.
- Update tests, docs, and changelog only where they explicitly assert or describe the target version.

### Constraints

- This is a dependency/runtime target bump, not an OmniCode release version bump.
- Keep the change to one bounded slice.
- Verify with `npm run check` and `npm test` before committing.

### Success Criteria

- `getRequiredOpenCodeVersion()` returns `1.14.30`.
- Tests that cover release/runtime metadata pass.
- `CHANGELOG.md` records the OpenCode target update.
- `npm run check` and `npm test` pass.

---

## Current Integration Task — Main Subagent Workflow Commits

### Problem

The current `feat/collaboration-polish` branch diverged before main merged the subagent workflow PR. The branch lacks the main commits for OmniCode settings primitives, optional omni subagents, and the `/omni-agents` setup command.

### Requested Behavior

- Integrate `origin/main` into `feat/collaboration-polish`.
- Preserve the collaboration-polish workflow changes and the subagent workflow changes from main.
- Resolve any conflicts narrowly.

### Constraints

- Do not rewrite history or force-push.
- Keep the integration as a normal merge commit if needed.
- Verify with `npm run check` and `npm test` after integration.

### Success Criteria

- The branch contains main commits `d0c2a63`, `18b5e26`, `ff88213`, and merge `7fef2e1` or their merged content.
- `git log HEAD..origin/main` is empty after integration.
- Verification passes.
