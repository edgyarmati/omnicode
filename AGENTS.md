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
  - automatic grill-me clarification before change requests
  - explicit skill-fit checkpoint before planning
  - planning before implementation
  - bounded task slices
  - verification after implementation
  - repo map for codebase awareness
  - skill discovery / required-skill guidance
- launch OpenCode through an `omnicode` command that uses OmniCode-specific config without mutating the user's normal OpenCode setup
- optionally enable native OpenCode sub-agents through `/omni-agents` without making them the default for every user

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
- optionally registers native OpenCode subagents (`omni-explorer`, `omni-planner`, `omni-verifier`, `omni-worker`) when enabled through OmniCode settings
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
  - `omnicode_agents_status`
  - `omnicode_update_agents_settings`
  - `omnicode_read_model_recommendations`
- bootstraps `.omni/` on `session.created`
- adds `.omni/STATE.md` into compaction context
- guards `write` / `edit` when Omni mode is on and planning artifacts are missing
- placeholder bootstrap planning files are not enough; source edits require real planning content

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
- `commands/omni-agents.md`
- `commands/omni-import-standards.md`
- `commands/omni-skills.md`
- `commands/commit.md`
- `commands/push.md`
- workflow skills:
  - `grill-me.md`
  - `find-skills.md`
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
- `docs/2026-04-24-omnicode-design.md`
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
- state/session-summary lifecycle tools work in tests and runtime
- optional native subagents are controlled by `~/.omnicode/settings.json` with gitignored project overrides in `.omnicode/settings.json`
- automated tests cover launcher config isolation, standards discovery/import, repo map generation, skill suggestion, lifecycle updates, and planning-artifact readiness

## Known gaps / next work

These are the next most valuable slices:

1. **Workflow enforcement hardening**
   - current enforcement blocks `write`/`edit` until `.omni/SPEC.md`, `.omni/TASKS.md`, and `.omni/TESTS.md` contain non-placeholder planning content
   - may need stronger or more precise guarding once more real OpenCode sessions are observed

2. **Standards UX improvement**
   - support friendlier selection/review flows beyond import-all or explicit relative paths

3. **Repo map + skill routing refinement**
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
