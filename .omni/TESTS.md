# Tests

## Checks

- [x] `npm run check` after each implementation slice
- [x] `npm test` after each implementation slice
- [x] Atomic helper preserves permissions on replacement
- [x] Representative plugin `.omni` write uses atomic helper successfully
- [x] Sanitizers collapse unsafe multi-line markdown/tool text into safe generated output
- [x] Standards import handles embedded code fences/headings without breaking output structure
- [x] Launcher semver comparison handles stable vs prerelease and prerelease identifier ordering

## Expected outcomes

- Existing behavior remains compatible for normal inputs.
- Hardening tests fail on the old direct/unsafe behavior and pass after the backport.
- No source slice is committed until check and test pass.

---

## Current Review Task Verification

- [x] `npm run check` result observed: passed.
- [x] `npm test` result observed: passed, 29 tests.
- [x] Review covers the plugin, launcher, tests, scripts/installers, release workflow, and docs at a high level.
- [x] Findings are prioritized and include actionable next steps.

---

## Review Finding Fixes Verification

- [x] Slice 1: plugin tests cover bash mutation rejection before planning and resolved `.omni` containment.
- [x] Slice 1: plugin tests cover SKILLS user notes preservation and large repo-map file truncation/skipping.
- [x] Slice 2: launcher tests cover `--check`/`--version` non-launching behavior and Windows-safe shim imports.
- [x] Slice 3: launcher/docs tests cover generic release artifact naming and installer publication/documentation consistency.
- [x] Run `npm run check` and `npm test` after each slice before committing.
