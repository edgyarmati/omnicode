# Changelog

## 0.3.0

### Features

- **Automatic grill-me clarification** — change requests (new features, fixes, refactors, migrations) now automatically trigger a one-question-at-a-time interview until behavior, constraints, non-goals, edge cases, and success criteria are concrete enough to plan safely.
- **Enforced skill-fit checkpoint** — after clarification, the agent judges whether bundled/project skills cover the task. If not, it uses `find-skills` to discover relevant external skills before planning. Supports removing skills from project memory when the user requests it.
- **Project-local skill maker workflow** — when `find-skills` cannot find adequate coverage, OmniCode can create a narrow local skill under `.omni/skills/` for the current project without installing global user skills.
- **Workflow settings primitives** — OmniCode now resolves protected-branch workflow policy from global `~/.omnicode/settings.json` plus optional project-local `.omnicode/settings.json` overrides and exposes the effective policy in state output.
- **Protected-branch workflow guard** — source edits and mutating shell commands are blocked on protected branches such as `main`/`master` by default once planning is ready, unless global or project OmniCode settings explicitly allow direct protected-branch changes.
- **Branch-scoped planning path helpers** — OmniCode can derive safe work IDs from git branch names and select `.omni/work/<branch-slug>/` planning paths with root planning fallback when no branch is available.
- **Active work planning guard** — the plan-before-edit guard now prefers branch-scoped `.omni/work/<branch-slug>/SPEC.md`, `TASKS.md`, and `TESTS.md` while still accepting legacy root planning files as a migration fallback.

### Fixes

- **Harden plugin workflow guardrails** — blocks mutating bash commands (shell redirections, `rm`, `cp`, `tee`, etc.) before planning artifacts exist. Replaces string-based `.omni` path matching with resolved path containment. Preserves user-managed `SKILLS.md` project notes across updates.
- **Harden launcher install checks** — adds `--check` and `--version` flags that return without launching or installing the managed OpenCode runtime. Updates POSIX and Windows installers to use `--check` for verification instead of running the launcher.
- **Windows-safe plugin shim imports** — generates `file://` URL import specifiers in the plugin shim so Windows absolute drive paths are valid ESM module specifiers.
- **Write plugin `.omni` files atomically** — all plugin-generated durable/runtime files are written through an atomic rename helper that preserves existing file permissions.
- **Sanitize generated markdown** — state, session summary, skill, repo map, and standards content is sanitized so tool inputs or imported file contents cannot inject new top-level markdown structure.
- **Harden semver comparison** — launcher version comparison correctly handles prerelease identifiers and ignores build metadata per semver precedence rules.
- **Reject untrusted `OMNICODE_SETUP_TARGET`** — validates the env var matches `omnicode[@version]` before passing it to `npm install -g`.
- **Reject non-semver version strings from `current.json`** — managed runtime metadata is validated against strict semver before use as a path segment.
- **Harden `readSkill` and `importStandards`** — skill name validation refuses traversal/null-byte escapes; standards import verifies resolved paths stay under the project root.
- **Write `opencode.json` and plugin shim atomically with 0600 perms** — launcher config writes refuse to follow symlinks and keep files private.

### Performance

- **Summarize repo map files concurrently** — repo map generation uses a bounded concurrency pool (16 workers) instead of sequential file reads.

### CI / Release

- **Gate release on `npm run check` and `npm test`** — the release workflow runs type-checking and tests before building the bundle.
- **Publish installer scripts as release assets** — `install.sh` and `install.ps1` are uploaded alongside the tarball and `SHA256SUMS`.
- **Verify SHA256SUMS in installers** — both POSIX and Windows installers download and verify checksums before extracting the release archive.
- **Align release bundle documentation** — release metadata, workflow, installers, README, AGENTS, and release checklist now consistently describe the current generic JS bundle artifact.
- **Keep changelog updates with every committed change** — repository agent guidance now requires each committed slice to update `CHANGELOG.md` for the next release so release notes stay complete.
- **Design collaboration-safe Omni memory** — documented the planned split between shared project memory, per-branch `.omni/work/<branch>/` planning, untracked runtime state, and protected-branch settings guardrails.

### Tests

- Added tests for `tool.execute.before` write/edit guard end-to-end.
- Added tests for mutating bash rejection, `.omni` path containment, and non-mutating bash passthrough.
- Added tests for atomic write permission preservation.
- Added tests for markdown sanitization and embedded fence handling.
- Added tests for semver prerelease ordering and build metadata.
- Added tests for `grill-me` and `find-skills` suggestion heuristics.
- Added tests for `skill-maker` suggestion heuristics.
- Added tests for workflow settings defaults, global/project override merge, invalid settings fallback, and status formatting.
- Added tests for git branch detection, protected-branch blocking, and project settings overrides in the mutating-tool guard.
- Added tests for branch slug generation and active `.omni/work/<branch-slug>/` planning path selection.
- Added tests for active work planning readiness, legacy root fallback, and branch-aware planning guard messages.
- Added tests for SKILLS project notes preservation and large repo-map file skipping.
- Added tests for launcher `--check`/`--version` non-launching behavior.
- Added tests for Windows-safe plugin shim import specifiers.
- Added tests for release metadata alignment with the generic JS bundle.

---

## 0.2.1

- Initial public release: OpenCode plugin + launcher, `.omni/` durable memory, plan-before-edit guard, repo map, skill suggestion, isolated config, RTK integration.
