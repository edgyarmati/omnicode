# Spec

## Problem

Recent Omni-Pi release-readiness work fixed several workflow reliability and hardening issues that also apply to OmniCode's OpenCode plugin + launcher: direct `.omni` writes can leave truncated files, user-controlled text can alter generated markdown structure, simple semver comparison mishandles prereleases, and repo-map generation can be made safer and more reliable.

## Requested Behavior

Backport the relevant Omni-Pi hardening ideas into OmniCode in bounded slices:

1. **Atomic `.omni` writes**: shared atomic write helper writes sibling temp files and renames into place, preserving existing file permissions when replacing files. Use it for plugin-generated `.omni` durable/runtime files and launcher metadata/config writes where practical.
2. **Safe generated markdown**: sanitize user/tool-provided state, session summary, skill, and repo/standards-derived markdown fragments before writing `.omni` files so newlines, headings, list markers, fences, and control characters cannot fabricate sibling sections or break code fences.
3. **Semver prerelease ordering**: launcher version comparison should treat a stable release as newer than its prerelease and compare prerelease identifiers according to semver precedence; build metadata must not affect precedence.
4. **Repo-map hardening**: keep repo-map generation narrow but improve direct-write reliability and avoid avoidable per-file sequential work where a small helper is sufficient.

## Constraints

- Keep OmniCode as an OpenCode plugin + launcher; do not reintroduce Omni-Pi shell/runtime concepts.
- Keep each slice small, testable, and committed before moving to the next slice.
- Maintain current public command/tool names and existing behavior unless hardening requires safe normalization.
- Use conventional commit messages for each slice.

## Success Criteria

- `.omni` plugin outputs are written through atomic rename helpers and preserve existing file permissions.
- Tests cover atomic write behavior and at least one representative plugin write path.
- State/session-summary/skills/standards/repo-map generated content cannot inject new top-level markdown structure through tool inputs or imported file contents.
- Launcher semver comparison passes prerelease precedence tests.
- Existing `npm run check` and `npm test` pass after each committed slice.

---

## Current Review Task — General Codebase Review

### Problem

The maintainer requested a broad repository review rather than a diff-only review: code quality, functionality, architecture, release readiness, tests, gaps, and actionable next work.

### Requested Behavior

Perform a review-only pass over the OmniCode repository using project docs, standards, repo map, source files, tests, scripts, and release workflow assets. Do not implement source changes unless explicitly requested afterward.

### Success Criteria

- Identify concrete correctness, reliability, maintainability, security, release, and test-coverage concerns with file references where possible.
- Distinguish confirmed issues from speculative risks.
- Prioritize findings by severity and propose bounded follow-up slices.
- Record review progress in Omni state/session notes without committing unless explicitly requested.

---

## Current Implementation Task — Review Finding Fixes

### Problem

The general codebase review identified concrete reliability/release-readiness gaps: the planning guard can be bypassed through bash and weak `.omni` path checks, repo-map/skills helpers can damage performance or durable notes, installer verification can launch runtime setup, Windows plugin shims may emit invalid ESM imports, and release/docs/tests disagree about the artifact model.

### Requested Behavior

Implement the fixes in bounded, verified slices:

1. Harden plugin workflow behavior: detect common mutating bash commands before planning, resolve `.omni` containment instead of string-matching paths, cap repo-map file reads, and preserve user-managed `SKILLS.md` notes.
2. Harden launcher/install behavior: generate ESM-safe plugin shim imports on Windows/POSIX and add a non-launching `--check`/`--version` path for installers.
3. Align release/docs/tests: choose the current generic JS bundle model, remove misleading platform-specific artifact expectations, publish or document installers consistently, and clean stale docs.

### Constraints

- Keep OmniCode as OpenCode plugin + launcher; do not add a custom shell.
- Preserve public tool/command names.
- Keep each slice independently verified and committed with a conventional commit.
- Do not weaken launcher isolation or planning-before-edit semantics.

### Success Criteria

- Tests cover bash/path guard hardening, SKILLS preservation, large repo-map file handling, Windows-safe plugin shim imports, and installer `--check` behavior.
- `npm run check` and `npm test` pass after each slice.
- Release metadata, workflow, installers, README/AGENTS/checklist describe the same current artifact model.
