# OmniCode

OmniCode is an **OpenCode plugin + launcher** that brings the Omni workflow into OpenCode without forking OpenCode or replacing its UI.

## What OmniCode owns

- `.omni/` durable project memory
- Omni workflow enforcement
- repo map generation for codebase awareness
- skill discovery and required-skill loading
- an `omnicode` launcher that starts OpenCode with OmniCode-specific config

## What OpenCode owns

- terminal UI
- model/provider/auth UX
- sessions and core runtime
- built-in tools and host application behavior

## Packages

- `packages/plugin` — `@omnicode/plugin`
- `packages/launcher` — `omnicode`

## Current status

Working first cut complete.

Implemented and smoke-tested:

1. isolated OpenCode launch path
2. `.omni` bootstrap
3. custom OmniCode tools
4. default OmniCode agent instructions
5. workflow guardrails for planning before editing
6. real OpenCode plugin loading via the `omnicode` launcher
7. standards discovery/import into `.omni/STANDARDS.md`
8. ranked repo map output into `.omni/REPO-MAP.md` and `.omni/REPO-MAP.json`
9. basic skill routing and `.omni/SKILLS.md` syncing for current work

## Launcher behavior

`omnicode` starts OpenCode with an OmniCode-specific config home so it does not inherit unrelated global OpenCode plugins/config:

- `XDG_CONFIG_HOME=~/.config/omnicode`
- `OPENCODE_CONFIG=~/.config/omnicode/opencode/opencode.json`
- `OPENCODE_CONFIG_DIR=~/.config/omnicode/opencode`
- `OPENCODE_CLIENT=omnicode`

That keeps normal `opencode` usage separate while still using the same installed OpenCode binary.

## Quick usage

```bash
npm install
node packages/launcher/bin/omnicode.js --help
node packages/launcher/bin/omnicode.js agent list
node packages/launcher/bin/omnicode.js run --agent omnicode --model opencode/hy3-preview-free "Bootstrap this project for OmniCode and summarize the current state."
node packages/launcher/bin/omnicode.js run --agent omnicode --model opencode/hy3-preview-free "Bootstrap this project, discover external standards, import them, and tell me what was imported."
node packages/launcher/bin/omnicode.js run --agent omnicode --model opencode/hy3-preview-free "Bootstrap this project, generate the repo map, suggest skills for implementing and verifying a repo map improvement, and summarize the results."
```

## Automated coverage

Current automated tests cover:
- launcher config isolation and generated shim/config files
- standards discovery/import
- ranked repo map generation
- skill suggestion and `.omni/SKILLS.md` syncing
- planning-artifact readiness checks for the write/edit guard

## Repo hygiene

For the OmniCode repo itself, generated runtime/project state should not be committed:
- `.omni/`
- `.pi/`

## Development

```bash
npm install
npm run build
npm run check
npm test
```
