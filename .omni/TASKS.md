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
