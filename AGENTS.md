# AGENTS.md

This repository is **OmniCode**.

## What OmniCode is

OmniCode is an **OpenCode plugin + launcher**.

It is **not**:
- a custom terminal UI
- a fork of OpenCode
- a continuation of the old Omni-Pi standalone shell work

OpenCode owns the UX and runtime. OmniCode owns the **workflow layer**.

## Product goal

Bring the Omni workflow into OpenCode with a thin wrapper.

Core idea:
- keep OpenCode as the mature host app
- load OmniCode as a plugin
- preserve the Omni workflow:
  - `.omni/` durable memory
  - collaboration-safe per-work memory direction for parallel branches
  - automatic grill-me clarification before change requests
  - documentation-aware grilling for domain language and durable decisions
  - explicit skill-fit checkpoint before planning
  - planning before implementation
  - TDD/red-green-refactor guidance for behavior-changing implementation slices
  - diagnose workflow guidance for bugs and performance regressions
  - architecture deepening review available as an explicit user-triggered command
  - bounded task slices
  - verification after implementation
  - clean-context review before committing meaningful implementation slices
  - single-writer orchestration where subagents contribute intelligence while the primary agent owns active-worktree writes and decisions
  - repo map for codebase awareness
  - skill discovery / required-skill guidance
- launch OpenCode through an `omnicode` command that uses OmniCode-specific config without mutating the user's normal OpenCode setup

## Current architecture

### Packages

- `packages/plugin` → `@omnicode/plugin`
  - OpenCode plugin
  - registers OmniCode agent/config/commands/tools
  - bootstraps `.omni/`
  - adds workflow guardrails

- `packages/launcher` → `omnicode`
  - wrapper CLI
  - ensures OpenCode exists or attempts install
  - writes OmniCode-specific OpenCode config under `~/.config/omnicode/opencode/`
  - writes a local plugin shim there
  - isolates OmniCode from normal OpenCode config via `XDG_CONFIG_HOME=~/.config/omnicode`
  - launches OpenCode with `OPENCODE_CONFIG`, `OPENCODE_CONFIG_DIR`, and `OPENCODE_CLIENT=omnicode`

## Current implemented behavior

### Plugin

Implemented in `packages/plugin/src/index.ts`.

Current features:
- registers default `omnicode` agent
- loads OmniCode command markdown files from `src/resources/commands/`
- exposes custom tools:
  - `omnicode_bootstrap`
  - `omnicode_set_mode`
  - `omnicode_state`
  - `omnicode_update_state`
  - `omnicode_append_session_summary`
  - `omnicode_repo_map`
  - `omnicode_discover_standards`
  - `omnicode_import_standards`
  - `omnicode_suggest_skills`
  - `omnicode_update_skills`
  - `omnicode_list_skills`
  - `omnicode_read_skill`
  - `omnicode_collaboration_status`
  - `omnicode_start_work`
  - `omnicode_create_pr`
  - `omnicode_migrate_root_plan`
- bootstraps `.omni/` on `session.created`
- adds active `.omni/runtime/<branch-slug-or-root>/STATE.md` into compaction context
- guards `write` / `edit` when Omni mode is on and planning artifacts are missing
- placeholder bootstrap planning files are not enough; source edits require real planning content
- optional native subagents follow a single-writer model: `omni-explorer`, `omni-planner`, and `omni-verifier` are read-only/advisory intelligence helpers by default; `omni-worker` is exceptional and one-slice-only, not a casual parallel writer swarm

Planning artifacts currently required before source editing:
- `.omni/SPEC.md`
- `.omni/TASKS.md`
- `.omni/TESTS.md`

### Bundled resources

Under `packages/plugin/src/resources/`:
- `instructions/omnicode-agent.md`
- `commands/omni-init.md`
- `commands/omni-mode.md`
- `commands/omni-status.md`
- `commands/omni-import-standards.md`
- `commands/omni-skills.md`
- `commands/commit.md`
- `commands/push.md`
- `commands/improve-codebase-architecture.md`
- `commands/clean-context-review.md`
- workflow skills:
  - `grill-me.md`
  - `grill-with-docs.md`
  - `find-skills.md`
  - `skill-maker.md`
  - `tdd.md`
  - `diagnose.md`
  - `improve-codebase-architecture.md`
  - `brainstorming.md`
  - `omni-planning.md`
  - `omni-execution.md`
  - `omni-verification.md`

### Launcher

Implemented in `packages/launcher/bin/omnicode.js`.

Current behavior:
- resolves native-launcher release metadata for the desired OpenCode target version
- installs/uses an OmniCode-managed per-user OpenCode runtime (`npm --prefix <managed-dir>`) when needed
- tracks managed runtime metadata under OmniCode user data directories
- writes config to:
  - `~/.config/omnicode/opencode/opencode.json`
  - `~/.config/omnicode/opencode/plugins/omnicode-plugin.js`
- launches OpenCode with OmniCode env overrides

## Important design decisions

- **filesystem/repo name**: `omnicode/`
- **product branding**: `OmniCode`
- v1 intentionally ignores:
  - provider management from Omni-Pi
  - custom UI/theming/status work
  - standalone OpenTUI shell work
- focus only on the real differentiator: **the Omni workflow layer**

## Documents to read first

- `README.md`
- `docs/current-orchestration-model.md`
- `docs/2026-04-24-omnicode-design.md`
- `docs/2026-04-30-collaborative-memory-design.md`
- `docs/implementation-plan.md`

## Smoke-tested behavior

Verified in a real OpenCode runtime:
- the `omnicode` launcher loads the OmniCode plugin cleanly
- `omnicode` is available as an OpenCode agent
- OmniCode commands and tools register successfully
- `omnicode_bootstrap` works in a live run
- standards discovery/import works and writes `.omni/STANDARDS.md`
- ranked repo map output works and writes `.omni/REPO-MAP.md` plus `.omni/REPO-MAP.json`
- skill suggestion/sync works and writes `.omni/SKILLS.md`
- the write/edit guard blocks early writes until real planning content exists in `SPEC.md`, `TASKS.md`, and `TESTS.md`
- bundled `grill-with-docs` guidance is available for domain-language and ADR-aware clarification
- bundled `tdd` guidance is available for behavior-changing slices and records expectations in the active work `TESTS.md`
- bundled `diagnose` guidance is available for bugs/performance regressions before patching
- `/improve-codebase-architecture` is available as a review-only workflow command for architecture deepening opportunities
- `/clean-context-review` is available as a review/adjudication-only workflow command for pre-commit diff review
- optional native subagent guidance preserves a single active writer and adds clean-context review before commits
- state/session-summary lifecycle tools work in tests and runtime
- automated tests cover launcher config isolation, standards discovery/import, repo map generation, skill suggestion, lifecycle updates, and planning-artifact readiness
- collaboration status reports the current branch, protected-branch policy, active `.omni/work/<branch-slug>/` planning path, and planning readiness

## Known gaps / next work

These are the next most valuable slices:

1. **Workflow enforcement hardening**
   - current enforcement blocks `write`/`edit` until `.omni/SPEC.md`, `.omni/TASKS.md`, and `.omni/TESTS.md` contain non-placeholder planning content
   - may need stronger or more precise guarding once more real OpenCode sessions are observed

2. **Collaborative memory / branch workflow**
   - implement the design in `docs/2026-04-30-collaborative-memory-design.md`
   - select `.omni/work/<branch-slug>/` as active planning memory for collaborative work
   - block protected-branch implementation by default unless OmniCode settings explicitly allow it

3. **Standards UX improvement**
   - support friendlier selection/review flows beyond import-all or explicit relative paths

4. **Repo map + skill routing refinement**
   - improve incrementality/ranking further and move beyond heuristic skill suggestion if needed

## Build / check

From repo root:

```bash
./scripts/setup
npm run check
npm test
```

## Release setup assets

- `scripts/setup` bootstraps a fresh checkout for contributors and pre-release testing.
- root `install.sh` and `install.ps1` are the target public installers for native launcher releases.
- `scripts/install.sh` is now a compatibility wrapper to the root POSIX installer.
- `.github/workflows/release.yml` builds and publishes the tagged generic JS bundle plus installer scripts.
- `scripts/release/bundle.sh` defines the current release artifact layout/naming.
- `docs/release-checklist.md` is the required release runbook.
- the `omnicode` launcher package in `packages/launcher/` is still the current dev/runtime entrypoint, with release direction toward standalone OmniCode binaries plus a managed per-user OpenCode runtime.

## Repo hygiene

For OmniCode, `.omni/` is intentionally split.

Every committed change must also update `CHANGELOG.md` with the user-facing change, fix, test, documentation, or process note that should appear in the next release. Keep the changelog current during each slice so release prep is a cleanup pass, not archaeology.

Durable `.omni` files may be committed when they reflect real project intent:
- `PROJECT.md`
- `SPEC.md`
- `TASKS.md`
- `TESTS.md`
- `DECISIONS.md`
- `STANDARDS.md`
- `SKILLS.md`
- `CONFIG.md`
- `VERSION`
- `.gitignore`

Runtime/generated `.omni` files stay out of git by default:
- `runtime/`
- `STATE.md`
- `SESSION-SUMMARY.md`
- `REPO-MAP.md`
- `REPO-MAP.json`

`.pi/` stays out of git as runtime state too.

## Notes for the next agent

- Do **not** drift back into building a custom shell.
- Treat OpenCode as the host product.
- Keep the launcher thin and the plugin thick.
- Preserve the user's normal OpenCode setup; OmniCode should only affect launches through `omnicode`.
- Favor workflow reliability over fancy UX.
