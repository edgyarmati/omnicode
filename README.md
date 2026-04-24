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
2. `.omni` bootstrap with better starter templates and selective `.omni/.gitignore`
3. custom OmniCode tools
4. default OmniCode agent instructions
5. workflow guardrails for planning before editing
6. real OpenCode plugin loading via the `omnicode` launcher
7. standards discovery/import into `.omni/STANDARDS.md`
8. ranked repo map output into `.omni/REPO-MAP.md` and `.omni/REPO-MAP.json`
9. basic skill routing and `.omni/SKILLS.md` syncing for current work
10. explicit lifecycle updates for `.omni/STATE.md` and `.omni/SESSION-SUMMARY.md`

## Launcher behavior

`omnicode` starts OpenCode with an OmniCode-specific config home so it does not inherit unrelated global OpenCode plugins/config:

- `XDG_CONFIG_HOME=~/.config/omnicode`
- `OPENCODE_CONFIG=~/.config/omnicode/opencode/opencode.json`
- `OPENCODE_CONFIG_DIR=~/.config/omnicode/opencode`
- `OPENCODE_CLIENT=omnicode`

That keeps normal `opencode` usage separate while still using the same installed OpenCode binary.

## Install

### Primary: one-command install

```bash
curl -fsSL https://raw.githubusercontent.com/edgyarmati/omnicode/main/scripts/install.sh | bash
omnicode
```

This uses `npx omnicode@latest setup` under the hood.

### Direct setup fallback

```bash
npx omnicode@latest setup
omnicode
```

### npm fallback

```bash
npm install -g omnicode@latest
omnicode
```

### Contributor setup

```bash
git clone https://github.com/edgyarmati/omnicode
cd omnicode
./scripts/setup
omnicode
```

On first launch, OmniCode creates its isolated OpenCode config automatically and will attempt a best-effort OpenCode install if `opencode` is not already available.

## Quick usage

```bash
omnicode --help
omnicode agent list
omnicode run --agent omnicode --model opencode/hy3-preview-free "Bootstrap this project for OmniCode and summarize the current state."
omnicode run --agent omnicode --model opencode/hy3-preview-free "Bootstrap this project, discover external standards, import them, and tell me what was imported."
omnicode run --agent omnicode --model opencode/hy3-preview-free "Bootstrap this project, generate the repo map, suggest skills for implementing and verifying a repo map improvement, and summarize the results."
```

## Automated coverage

Current automated tests cover:
- launcher config isolation and generated shim/config files
- release setup assets and launcher package metadata assumptions
- Node version prerequisite helpers for install/setup flows
- standards discovery/import
- ranked repo map generation
- skill suggestion and `.omni/SKILLS.md` syncing
- state/session-summary lifecycle updates
- planning-artifact readiness checks for the write/edit guard (`SPEC.md`, `TASKS.md`, and `TESTS.md`)

## Repo hygiene

For OmniCode, `.omni/` is split into **durable** vs **runtime** state.

Durable `.omni` files may be committed when they reflect real project intent:
- `PROJECT.md`
- `SPEC.md`
- `TASKS.md`
- `TESTS.md`
- `DECISIONS.md`
- `STANDARDS.md`
- `SKILLS.md`
- `CONFIG.md`
- `VERSION`
- `.gitignore`

Runtime/generated `.omni` files stay out of git by default:
- `STATE.md`
- `SESSION-SUMMARY.md`
- `REPO-MAP.md`
- `REPO-MAP.json`

`.pi/` also stays out of git.

## Troubleshooting

- If the installer says Node is missing or too old, install Node.js 22+ and rerun it.
- If the one-command installer fails, run `npx omnicode@latest setup` directly.
- If `omnicode` is not found after setup, restart your shell or add the npm global bin directory reported by setup to your `PATH`.
- If first-run OpenCode installation fails, install it manually with `npm install -g opencode-ai` and run `omnicode` again.

## Development

```bash
./scripts/setup
npm run check
npm test
```
