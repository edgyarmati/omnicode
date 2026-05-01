# Tasks

## Planned slices

- [x] Slice 1: add `tdd` bundled skill, active `TESTS.md` guidance, suggestion heuristics, docs, tests, verify, and commit.
- [x] Slice 2: add `diagnose` bundled skill, bug/performance routing, docs, tests, verify, and commit.
- [x] Slice 3: add `grill-with-docs` bundled skill as enhanced clarification variant, docs, tests, verify, and commit.
- [x] Slice 4: add `improve-codebase-architecture` bundled skill plus slash command, docs, tests, verify, and commit.

## Notes

- Keep each workflow resource concise and OmniCode-native.
- Do not create hard tool-level TDD/diagnose guards in this pass.
- `TESTS.md` means the active planning directory's tests artifact, usually `.omni/work/<branch-slug>/TESTS.md`, with root `.omni/TESTS.md` only as migration fallback.

---

## OpenCode Target Version Update

- [x] Slice 5: update managed OpenCode target to `1.14.30`, adjust tests/docs/changelog if needed, verify, and commit.

---

## Main Subagent Workflow Integration

- [x] Slice 6: merge `origin/main` into `feat/collaboration-polish`, resolve conflicts, verify, and commit merge.

---

## Single-Writer Intelligence Orchestration

- [x] Slice 7: policy/docs/tests only — reframe native subagent orchestration around single-writer ownership, read-only discovery/planning/verification, smart-friend guidance, clean-context review before commit, and branch-backed worker mode as later explicit isolation.
- [x] Slice 8: add `/clean-context-review` workflow command, update commit/docs/tests/changelog, verify, clean-review, and commit.
- [ ] Future research only: branch/worktree-backed worker mode if users need large multi-PR delegation; do not implement now.
