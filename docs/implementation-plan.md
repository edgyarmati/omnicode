# OmniCode Implementation Plan

## Phase 1

- [x] create nested standalone repo
- [x] write design doc
- [x] scaffold plugin package
- [x] scaffold launcher package
- [x] install dependencies and type-check
- [x] verify launcher-generated config flow
- [x] smoke-test plugin loading in OpenCode

## Verified

- launcher-generated config loads only the OmniCode plugin when started through `omnicode`
- OpenCode resolves `default_agent: omnicode`
- OmniCode commands and tools are registered in a real OpenCode runtime
- end-to-end run succeeded: bootstrap → guard blocks early write → planning files updated → write succeeds
- standards import works in a live run and writes `.omni/STANDARDS.md`
- ranked repo map output works in a live run and writes `.omni/REPO-MAP.md` plus `.omni/REPO-MAP.json`
- skill suggestion/sync works in a live run and writes `.omni/SKILLS.md`
- automated tests cover launcher config isolation, standards discovery/import, repo map generation, skill suggestion, and planning-artifact guard readiness

## Next slices

1. Refine `.omni` bootstrap defaults and mode switching UX
2. Improve standards-import selection UX beyond import-all or explicit paths
3. Add more end-to-end runtime tests beyond the current unit-level coverage
4. Improve repo-map incrementality/ranking further if needed
5. Improve skill routing beyond the current heuristic suggestion model if needed
