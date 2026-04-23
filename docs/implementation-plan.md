# OmniCode Implementation Plan

## Phase 1

- [x] create nested standalone repo
- [x] write design doc
- [x] scaffold plugin package
- [x] scaffold launcher package
- [x] install dependencies and type-check
- [x] verify launcher-generated config flow
- [ ] smoke-test plugin loading in OpenCode

## Next slices

1. Harden `.omni` bootstrap and mode switching
2. Improve standards import from AGENTS/CLAUDE/Cursor-style files
3. Make repo map incremental instead of fully regenerated per call
4. Expand skill routing and project-skill lifecycle
5. Add tests around tool guards and launcher config generation
