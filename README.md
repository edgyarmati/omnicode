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

### Planned release installers

Release artifacts are produced by GitHub Actions (`.github/workflows/release.yml`) from tagged versions and documented in `docs/release-checklist.md`.

The target release model is:

#### macOS / Linux
```bash
curl -fsSL https://raw.githubusercontent.com/edgyarmati/omnicode/main/install.sh | bash
omnicode
```

#### Windows
```powershell
irm https://raw.githubusercontent.com/edgyarmati/omnicode/main/install.ps1 | iex
omnicode
```

Those native installers are now scaffolded in the repo, but the cross-platform binary release artifacts are not published yet.

### Current contributor setup

```bash
git clone https://github.com/edgyarmati/omnicode
cd omnicode
./scripts/setup
omnicode
```

### Runtime direction

OmniCode now provisions and uses a per-user managed OpenCode runtime version by default (without mutating your normal global `opencode` setup). The native standalone OmniCode launcher binaries are still pending publication; current development usage remains via `./scripts/setup`.

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
- native installer asset scaffolding and launcher package metadata assumptions
- Node/version/runtime path helpers for the native-launcher foundation
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

- If you're testing from a checkout, use `./scripts/setup` for now rather than the unpublished release installers.
- If managed OpenCode runtime installation fails, rerun `omnicode` and follow the printed fallback command using the same `--prefix` path.
- If native launcher verification fails during install, the installer automatically falls back to `npx omnicode@latest setup` when available.
- If installer downloads fail, confirm the tagged release contains the expected assets listed in `docs/release-checklist.md`.

## Development

```bash
./scripts/setup
npm run check
npm test
```
