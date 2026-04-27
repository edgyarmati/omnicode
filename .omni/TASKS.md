# Tasks

## Planned slices

- [x] Slice 1: add shared atomic write helper and route generated `.omni` / launcher metadata writes through it
- [x] Slice 2: sanitize generated markdown/state/session-summary/skills/standards/repo-map fragments and add regression tests
- [x] Slice 3: harden launcher semver comparison for prerelease/build metadata and add tests
- [x] Slice 4: evaluate and apply a bounded repo-map hardening/performance improvement if still separate from Slice 1

## Notes

- Commit each verified slice before starting the next one.
- Prefer narrow backports that match OmniCode's simpler architecture rather than copying Omni-Pi internals wholesale.

---

## Current Review Task

- [x] Define review scope and success criteria.
- [x] Inspect repository structure, standards, and project docs.
- [x] Review plugin workflow implementation and tests.
- [x] Review launcher/runtime/install/release implementation and tests.
- [x] Assess cross-cutting quality, functionality gaps, risks, and missing tests.
- [x] Summarize prioritized findings and recommended next slices.

---

## Review Finding Fixes

- [x] Slice 1: harden plugin guard/path containment, preserve skills notes, and cap repo-map reads.
- [x] Slice 2: add safe launcher check/version behavior and Windows-safe plugin shim imports.
- [x] Slice 3: align release artifact model, docs, workflow assets, and tests.

---

## Automatic Grill-Me Clarification

- [x] Add bundled `grill-me` skill resource and default skills listing.
- [x] Update agent instructions so change requests automatically run grill-me clarification before planning/implementation.
- [x] Update skill suggestion heuristics and tests so `grill-me` triggers on feature/change/fix/refactor wording.
- [x] Update README/AGENTS docs for the new clarification checkpoint.
- [x] Verify with `npm run check` and `npm test`, then commit.
