# OmniCode Design

Date: 2026-04-24

## Goal

Build OmniCode as an OpenCode plugin plus a thin `omnicode` launcher, preserving the Omni workflow while dropping the custom Omni-Pi shell direction.

## Product shape

OmniCode is not a custom terminal app and not a fork of OpenCode.

It is:
- an OpenCode plugin package
- a launcher command that starts OpenCode with OmniCode-specific config and plugin loading

## Scope for v1

### In scope
- `.omni/` bootstrap and durable memory files
- passive standards/context support when Omni mode is off
- active Omni workflow when Omni mode is on
- repo map generation and prompt-usable tool access
- skill listing/loading with required-skill guidance
- workflow guardrails that discourage or block editing before planning
- isolated launch/config flow so normal OpenCode usage remains untouched

### Out of scope
- custom provider management
- custom OpenTUI or standalone shell work
- Omni-Pi-specific status widgets, themes, or updater UX

## Architecture

### `@omnicode/plugin`
Owns the Omni workflow behavior inside OpenCode.

Responsibilities:
- register a default `omnicode` agent with Omni workflow instructions
- bootstrap `.omni/` files in the current project
- expose custom tools for workspace bootstrap, repo map, state, and skills
- add custom commands for common OmniCode actions
- guard file-modifying tool usage when the project has not yet been planned
- inject better compaction context from `.omni/STATE.md`

### `omnicode` launcher
Owns environment preparation and OpenCode startup.

Responsibilities:
- locate `opencode` on PATH
- best-effort install OpenCode if missing
- create an OmniCode-specific OpenCode config directory
- write a local plugin shim that loads `@omnicode/plugin`
- launch OpenCode with `OPENCODE_CONFIG`, `OPENCODE_CONFIG_DIR`, and `OPENCODE_CLIENT=omnicode`

## Enforcement model

Workflow enforcement uses three layers:

1. **Agent instructions**
   - the default `omnicode` agent explains the mandatory workflow
2. **Custom tools**
   - the agent gets first-class tools for `.omni` bootstrap, state, repo map, and skills
3. **Tool guards**
   - when Omni mode is on, direct file edits/writes are blocked until planning artifacts exist

## Initial file model under `.omni/`

- `PROJECT.md`
- `SPEC.md`
- `TASKS.md`
- `TESTS.md`
- `STATE.md`
- `DECISIONS.md`
- `STANDARDS.md`
- `SKILLS.md`
- `SESSION-SUMMARY.md`
- `CONFIG.md`
- `VERSION`

## Risks

- OpenCode plugin hooks may not expose every prompt-injection seam we had in Pi
- edit/write guard behavior depends on actual tool argument shapes at runtime
- repo map must stay lightweight enough to avoid becoming another indexing project before the core workflow works

## Success criteria

- `omnicode` launches OpenCode with OmniCode loaded without changing normal OpenCode behavior
- a project can be bootstrapped into `.omni/`
- the default OmniCode agent knows and follows the Omni workflow
- editing is guarded when planning artifacts are missing
- repo map and skill tools are available to the agent
