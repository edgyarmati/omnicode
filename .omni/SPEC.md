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
