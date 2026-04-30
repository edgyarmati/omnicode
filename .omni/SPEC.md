# Spec

## Problem

Recent Omni-Pi release-readiness work fixed several workflow reliability and hardening issues that also apply to OmniCode's OpenCode plugin + launcher: direct `.omni` writes can leave truncated files, user-controlled text can alter generated markdown structure, simple semver comparison mishandles prereleases, and repo-map generation can be made safer and more reliable.

## Requested Behavior

Backport the relevant Omni-Pi hardening ideas into OmniCode in bounded slices:

1. **Atomic `.omni` writes**: shared atomic write helper writes sibling temp files and renames into place, preserving existing file permissions when replacing files. Use it for plugin-generated `.omni` durable/runtime files and launcher metadata/config writes where practical.
2. **Safe generated markdown**: sanitize user/tool-provided state, session summary, skill, and repo/standards-derived markdown fragments before writing `.omni` files so newlines, headings, list markers, fences, and control characters cannot fabricate sibling sections or break code fences.
3. **Semver prerelease ordering**: launcher version comparison should treat a stable release as newer than its prerelease and compare prerelease identifiers according to semver precedence; build metadata must not affect precedence.
4. **Repo-map hardening**: keep repo-map generation narrow but improve direct-write reliability and avoid avoidable per-file sequential work where a small helper is sufficient.

## Constraints

- Keep OmniCode as an OpenCode plugin + launcher; do not reintroduce Omni-Pi shell/runtime concepts.
- Keep each slice small, testable, and committed before moving to the next slice.
- Maintain current public command/tool names and existing behavior unless hardening requires safe normalization.
- Use conventional commit messages for each slice.

## Success Criteria

- `.omni` plugin outputs are written through atomic rename helpers and preserve existing file permissions.
- Tests cover atomic write behavior and at least one representative plugin write path.
- State/session-summary/skills/standards/repo-map generated content cannot inject new top-level markdown structure through tool inputs or imported file contents.
- Launcher semver comparison passes prerelease precedence tests.
- Existing `npm run check` and `npm test` pass after each committed slice.

---

## Current Review Task — General Codebase Review

### Problem

The maintainer requested a broad repository review rather than a diff-only review: code quality, functionality, architecture, release readiness, tests, gaps, and actionable next work.

### Requested Behavior

Perform a review-only pass over the OmniCode repository using project docs, standards, repo map, source files, tests, scripts, and release workflow assets. Do not implement source changes unless explicitly requested afterward.

### Success Criteria

- Identify concrete correctness, reliability, maintainability, security, release, and test-coverage concerns with file references where possible.
- Distinguish confirmed issues from speculative risks.
- Prioritize findings by severity and propose bounded follow-up slices.
- Record review progress in Omni state/session notes without committing unless explicitly requested.

---

## Current Implementation Task — Review Finding Fixes

### Problem

The general codebase review identified concrete reliability/release-readiness gaps: the planning guard can be bypassed through bash and weak `.omni` path checks, repo-map/skills helpers can damage performance or durable notes, installer verification can launch runtime setup, Windows plugin shims may emit invalid ESM imports, and release/docs/tests disagree about the artifact model.

### Requested Behavior

Implement the fixes in bounded, verified slices:

1. Harden plugin workflow behavior: detect common mutating bash commands before planning, resolve `.omni` containment instead of string-matching paths, cap repo-map file reads, and preserve user-managed `SKILLS.md` notes.
2. Harden launcher/install behavior: generate ESM-safe plugin shim imports on Windows/POSIX and add a non-launching `--check`/`--version` path for installers.
3. Align release/docs/tests: choose the current generic JS bundle model, remove misleading platform-specific artifact expectations, publish or document installers consistently, and clean stale docs.

### Constraints

- Keep OmniCode as OpenCode plugin + launcher; do not add a custom shell.
- Preserve public tool/command names.
- Keep each slice independently verified and committed with a conventional commit.
- Do not weaken launcher isolation or planning-before-edit semantics.

### Success Criteria

- Tests cover bash/path guard hardening, SKILLS preservation, large repo-map file handling, Windows-safe plugin shim imports, and installer `--check` behavior.
- `npm run check` and `npm test` pass after each slice.
- Release metadata, workflow, installers, README/AGENTS/checklist describe the same current artifact model.

---

## Current Implementation Task — Automatic Grill-Me Clarification

### Problem

OmniCode currently suggests brainstorming for creative work or behavior changes, but it does not explicitly force a rigorous shared-understanding checkpoint before planning and implementation. The maintainer wants the agent to automatically "grill" the user for requested changes, new features, fixes, refactors, or similar product/code modifications until the agent and user are fully aligned.

### Requested Behavior

Add a bundled `grill-me` workflow skill and route relevant change requests to it automatically through instructions and skill suggestion heuristics. The skill should interview the user one question at a time, provide a recommended answer for each question, use codebase exploration instead of asking when the answer is discoverable, and stop only when scope, constraints, behavior, edge cases, and success criteria are concrete enough to write/update `.omni/SPEC.md`, `.omni/TASKS.md`, and `.omni/TESTS.md`.

### Constraints

- Do not remove `brainstorming`; keep it for open-ended option generation.
- Preserve existing bundled skill names and public tool names.
- Keep the automatic trigger instruction practical: apply to change/feature/fix/refactor requests, not simple informational questions or explicit emergency one-liners.
- Commit after verification with a conventional commit.

### Success Criteria

- `grill-me` appears in bundled skills and default `.omni/SKILLS.md` content.
- `omnicode_suggest_skills` suggests `grill-me` for change/feature/fix/refactor requests.
- Agent instructions require a grill-me clarification checkpoint before planning/implementation for change requests.
- Tests cover skill listing/suggestion behavior.
- `npm run check` and `npm test` pass.

---

## Current Implementation Task — Enforced Skill-Fit Checkpoint

### Problem

OmniCode can suggest and load skills, but the workflow does not yet enforce a deliberate skill-fit decision after clarification. The maintainer wants a dedicated checkpoint where the model judges whether available project/bundled skills cover the clarified task, uses `find-skills` when they do not, removes skills from project memory when instructed, and only loads task skills from that checkpoint onward.

### Requested Behavior

After `grill-me` and before writing final planning artifacts, OmniCode must perform a skill-fit checkpoint:

1. Inventory currently available/bundled/project skills.
2. Judge whether they cover the clarified task's required domains.
3. If coverage is sufficient, load only the relevant skills and record them in `.omni/SKILLS.md`.
4. If coverage is insufficient, use `find-skills` to search for relevant external skills before planning.
5. If the user asks to delete/remove skills from the project, remove those skills from project memory instead of loading them.

### Constraints

- Keep `grill-me` as the clarification gate before this checkpoint.
- Do not load implementation/domain skills opportunistically before the checkpoint, except workflow skills needed to run the Omni process itself.
- Preserve public tool names.
- Keep `find-skills` as a bundled workflow skill/resource available to the agent.

### Success Criteria

- Agent instructions include an explicit post-grill skill-fit checkpoint.
- Bundled skills/default skill memory include `find-skills`.
- `omnicode_suggest_skills` suggests `find-skills` for skill discovery and insufficient-domain-coverage wording.
- Tests cover find-skills suggestion behavior and bundled skill updates.
- `npm run check` and `npm test` pass.

---

## Current Implementation Task — Project-Local Skill Maker

### Problem

The skill-fit checkpoint can discover missing skill coverage with `find-skills`, but it has no automatic fallback when no adequate skill exists or when an existing skill should not be installed globally. OmniCode needs a workflow-native way to create narrow, reusable, project-local skills before planning and before any worker subagents start execution.

### Requested Behavior

After `grill-me` clarification and during the skill-fit checkpoint:

1. Inventory bundled/project skills and judge coverage.
2. If coverage is insufficient, use `find-skills` to look for existing relevant skills first.
3. If no adequate existing skill is available, automatically use a new bundled `skill-maker` workflow skill.
4. `skill-maker` researches the missing expertise, preferably with a research/explore subagent when subagent-driven development is available, otherwise inline in the main agent.
5. `skill-maker` writes a narrow project-local skill under `.omni/skills/<skill-name>/SKILL.md` and records it in `.omni/SKILLS.md` so the main agent and future omni-worker subagents can load the needed context from the start.
6. Generated project-local skills must not be installed globally or mutate the user's global skill directories.

### Reference Model

Use Matt Pocock's `write-a-skill` skill as the primary style reference: concise SKILL.md, strong description triggers, progressive disclosure, optional scripts only for deterministic repeated work, and a lightweight review checklist. Borrow only lightweight research/testing ideas from Anthropic's `skill-creator`; do not require browser/eval-viewer loops for this automatic workflow.

### Constraints

- Keep the existing `find-skills` first; `skill-maker` is the fallback after discovery is inadequate.
- Do not ask for another approval before creating the local skill once the user has already approved automatic behavior.
- Keep generated skills project-local in `.omni/skills/`.
- Keep bundled workflow resources simple markdown files for now; no new public tool names are required for this slice.
- Preserve existing skill listing and suggestion tool compatibility.

### Success Criteria

- Bundled skills/default skill memory include `skill-maker`.
- Agent instructions document the post-find-skills automatic local-skill creation fallback.
- `find-skills` documents handing off to `skill-maker` when discovery is inadequate.
- `omnicode_suggest_skills` suggests `skill-maker` for missing/no relevant skill and skill-creation wording.
- README describes the local skill creation fallback.
- Tests cover bundled/default `skill-maker` inclusion and suggestion behavior.
- `npm run check` and `npm test` pass.

---

## Current Implementation Task — Changelog Update Discipline

### Problem

Committed changes can be easy to miss during release prep if the changelog is updated only at the end. OmniCode needs a repository instruction that every committed change also updates `CHANGELOG.md` for the upcoming release.

### Requested Behavior

- Update `AGENTS.md` to state that every change intended to be committed must include an appropriate `CHANGELOG.md` entry for the next release.
- Apply the rule to this change by updating `CHANGELOG.md` in the same slice.

### Constraints

- Keep the instruction concise and located with repo hygiene / agent workflow guidance.
- Do not change release versioning in this slice.

### Success Criteria

- `AGENTS.md` clearly requires changelog updates for committed changes.
- `CHANGELOG.md` includes this documentation/process change for the next release.
- Verification passes before commit.
