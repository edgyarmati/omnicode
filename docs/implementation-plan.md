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

## Next slices

1. Make repo map incremental instead of fully regenerated per call
2. Expand skill routing and project-skill lifecycle
3. Add tests around tool guards and launcher config generation
4. Refine `.omni` bootstrap defaults and mode switching UX
5. Improve standards-import selection UX beyond import-all or explicit paths
