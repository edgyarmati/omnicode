# Tests

## Slice 1 — TDD workflow

- [x] Add/update tests proving bundled/default skill memory includes `tdd`.
- [x] Add/update tests proving `omnicode_suggest_skills` suggests `tdd` for feature, behavior-change, refactor, and test-first/TDD wording.
- [x] Run `npm run check`.
- [x] Run `npm test`.

Expected outcome: type-check passes and the full test suite passes; TDD behavior is instruction/planning-based and documented around active-work `TESTS.md`. Observed: `npm run check` passed; `npm test` passed with launcher 10 tests and plugin 59 tests.

## Slice 2 — Diagnose workflow

- [ ] Add/update tests proving bundled skill listing/reading includes `diagnose`.
- [ ] Add/update tests proving default generated `.omni/SKILLS.md` includes `diagnose`.
- [ ] Add/update tests proving `omnicode_suggest_skills` suggests `diagnose` for bug, failure, debugging, and performance-regression wording.
- [ ] Run `npm run check`.
- [ ] Run `npm test`.

Expected outcome: bug/performance workflows route through diagnosis before TDD/regression-test work where applicable.

## Slice 3 — Grill with docs workflow

- [ ] Add/update tests proving bundled skill listing/reading includes `grill-with-docs`.
- [ ] Add/update tests proving default generated `.omni/SKILLS.md` includes `grill-with-docs`.
- [ ] Add/update tests proving `omnicode_suggest_skills` suggests `grill-with-docs` for domain language, ADR, decision-record, and durable-doc planning wording.
- [ ] Run `npm run check`.
- [ ] Run `npm test`.

Expected outcome: `grill-me` remains default; `grill-with-docs` is available for documentation-aware clarification.

## Slice 4 — Architecture improvement command

- [ ] Add/update tests proving bundled skill listing/reading includes `improve-codebase-architecture`.
- [ ] Add/update tests proving default generated `.omni/SKILLS.md` includes `improve-codebase-architecture`.
- [ ] Add/update tests proving command registration includes `improve-codebase-architecture`.
- [ ] Add/update tests proving suggestions route architecture/deepening/refactor-opportunity wording to the architecture skill.
- [ ] Run `npm run check`.
- [ ] Run `npm test`.

Expected outcome: `/improve-codebase-architecture` is review/planning-only by default and produces candidates before any refactor change request begins.
