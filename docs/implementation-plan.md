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
- automated tests cover launcher config isolation, standards discovery/import, and planning-artifact guard readiness

## Next slices

1. Make repo map incremental instead of fully regenerated per call
2. Expand skill routing and project-skill lifecycle
3. Refine `.omni` bootstrap defaults and mode switching UX
4. Improve standards-import selection UX beyond import-all or explicit paths
5. Add more end-to-end runtime tests beyond the current unit-level coverage
