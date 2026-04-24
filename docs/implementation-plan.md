# OmniCode Implementation Plan

## Phase 1 — Core baseline

- [x] create nested standalone repo
- [x] write design doc
- [x] scaffold plugin package
- [x] scaffold launcher package
- [x] install dependencies and type-check
- [x] verify launcher-generated config flow
- [x] smoke-test plugin loading in OpenCode
- [x] harden `.omni` lifecycle, mode state, and durable/runtime policy

## Phase 2 — Release setup

- [x] add a repo-local `scripts/setup` bootstrap for contributors and pre-release testing
- [x] add a public `scripts/install.sh` installer for one-command release onboarding
- [x] adjust package metadata and packaging files for public installability
- [x] document release install, fallback install, and troubleshooting in `README.md`
- [x] add tests for setup/install support logic and package assumptions
- [x] verify `./scripts/setup`, `npm run check`, `npm run build`, and `npm test`

## Verified

- launcher-generated config loads only the OmniCode plugin when started through `omnicode`
- OpenCode resolves `default_agent: omnicode`
- OmniCode commands and tools are registered in a real OpenCode runtime
- end-to-end run succeeded: bootstrap → guard blocks early write → planning files updated → write succeeds
- standards import works in a live run and writes `.omni/STANDARDS.md`
- ranked repo map output works in a live run and writes `.omni/REPO-MAP.md` plus `.omni/REPO-MAP.json`
- skill suggestion/sync works in a live run and writes `.omni/SKILLS.md`
- automated tests cover launcher config isolation, release setup assets/package assumptions, Node-version prerequisite helpers, standards discovery/import, repo map generation, skill suggestion, lifecycle updates, and planning-artifact guard readiness

## Next slices after release setup

1. Improve standards-import selection UX beyond import-all or explicit paths
2. Add more end-to-end runtime tests beyond the current unit-level coverage
3. Improve repo-map incrementality/ranking further if needed
4. Improve skill routing beyond the current heuristic suggestion model if needed
