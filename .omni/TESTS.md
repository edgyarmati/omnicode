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

---

## Automatic Grill-Me Clarification Verification

- [x] `omnicode_list_skills`/skill listing includes `grill-me`.
- [x] `suggestSkills` returns `grill-me` for a representative feature/change/fix request.
- [x] Agent instruction resource documents the automatic grill-me checkpoint and one-question-at-a-time behavior.
- [x] `npm run check` passes.
- [x] `npm test` passes.

---

## Enforced Skill-Fit Checkpoint Verification

- [x] `find-skills` appears in bundled skill resources and generated SKILLS content.
- [x] `suggestSkills` returns `find-skills` for skill discovery / missing-skill requests.
- [x] Agent instructions document the post-grill coverage judgment and skill-loading boundary.
- [x] `npm run check` passes.
- [x] `npm test` passes.

---

## Optional Native Sub-Agents Verification

- [x] Settings resolver reads `~/.omnicode/settings.json`, reads `<project>/.omnicode/settings.json`, and applies project override precedence.
- [x] Invalid/missing settings safely fall back to disabled/default values.
- [x] Project `.omnicode/` is added to the project `.gitignore` without overwriting existing entries.
- [ ] Plugin config does not register OmniCode subagents when the effective setting is disabled or absent.
- [ ] Plugin config registers `omni-explorer`, `omni-planner`, `omni-verifier`, and `omni-worker` as native subagents when enabled.
- [ ] Orchestrator task permissions allow the bundled Omni subagents without exposing arbitrary subagents by default.
- [ ] Model overrides from settings are applied without copying bundled prompts into settings.
- [ ] `/omni-agents` command resource exists and guides on/off/status/setup, including model inventory and recommendation markdown behavior.
- [x] Slice 1: `npm run check` passes.
- [x] Slice 1: `npm test` passes.
