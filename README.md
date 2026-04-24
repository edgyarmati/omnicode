# OmniCode

OmniCode is an **OpenCode plugin plus a thin launcher** that adds the Omni workflow to OpenCode without forking it or replacing its UI.

## Install

### macOS / Linux

```bash
curl -fsSL https://raw.githubusercontent.com/edgyarmati/omnicode/main/install.sh | bash
omnicode
```

### Windows

```powershell
irm https://raw.githubusercontent.com/edgyarmati/omnicode/main/install.ps1 | iex
omnicode
```

The installer downloads the tagged OmniCode bundle, installs it under a user-scoped OmniCode directory, and puts an `omnicode` launcher on your `PATH`. On first launch OmniCode provisions a per-user managed OpenCode runtime without mutating your normal global `opencode` install.

### Contributor / local checkout

```bash
git clone https://github.com/edgyarmati/omnicode
cd omnicode
./scripts/setup
omnicode
```

Release artifacts are produced by `.github/workflows/release.yml` from tagged versions. See [`docs/release-checklist.md`](docs/release-checklist.md) for the release runbook.

---

- **OmniCode** owns the workflow layer.
- **OpenCode** stays the host app and runtime.

## Contents

- [What OmniCode adds](#what-omnicode-adds)
- [The Omni workflow at a glance](#the-omni-workflow-at-a-glance)
- [Quick usage](#quick-usage)
- [Launcher behavior](#launcher-behavior)
- [Use OmniCode as a permanent OpenCode plugin](#use-omnicode-as-a-permanent-opencode-plugin)
- [Repo hygiene](#repo-hygiene)
- [Troubleshooting](#troubleshooting)
- [Development](#development)

## What OmniCode adds

- `.omni/` — durable project memory (spec, tasks, tests, decisions, standards, skills).
- Omni workflow enforcement — plan before editing, bounded slices, verify after.
- Repo map generation so the agent stays codebase-aware.
- Skill discovery and required-skill loading.
- An `omnicode` launcher that starts OpenCode with an isolated OmniCode config so it does not touch your normal `opencode` setup.

What stays with OpenCode: terminal UI, model/provider/auth UX, sessions and core runtime, built-in tools, and host application behavior.

## The Omni workflow at a glance

OmniCode keeps agent work disciplined by materializing context and gating dangerous steps behind planning.

1. **Bootstrap** — OmniCode seeds `.omni/` in the current project (`PROJECT.md`, `SPEC.md`, `TASKS.md`, `TESTS.md`, `STATE.md`, `DECISIONS.md`, `STANDARDS.md`, `SKILLS.md`, `SESSION-SUMMARY.md`, `CONFIG.md`, `VERSION`).
2. **Plan** — `SPEC.md`, `TASKS.md`, and `TESTS.md` must contain real planning content before the agent may use `write` or `edit` tools when Omni mode is on.
3. **Execute** — bounded task slices guided by the plan.
4. **Verify** — state and session summaries are updated through OmniCode tools so the next run has continuity.

`.omni/STATE.md` is also injected into OpenCode compaction context, so active state survives long sessions.

## Quick usage

```bash
omnicode --help
omnicode agent list
omnicode run --agent omnicode --model <provider>/<model> "Bootstrap this project for OmniCode and summarize the current state."
omnicode run --agent omnicode --model <provider>/<model> "Bootstrap this project, discover external standards, import them, and tell me what was imported."
omnicode run --agent omnicode --model <provider>/<model> "Bootstrap this project, generate the repo map, suggest skills for implementing and verifying a repo map improvement, and summarize the results."
```

Replace `<provider>/<model>` with any model identifier OpenCode supports (e.g. `opencode/hy3-preview-free`).

## Launcher behavior

`omnicode` starts OpenCode with an OmniCode-specific config home so it does not inherit unrelated global OpenCode plugins or config:

- `XDG_CONFIG_HOME=~/.config/omnicode`
- `OPENCODE_CONFIG=~/.config/omnicode/opencode/opencode.json`
- `OPENCODE_CONFIG_DIR=~/.config/omnicode/opencode`
- `OPENCODE_CLIENT=omnicode`

Normal `opencode` usage is unaffected; both use the same underlying OpenCode binary.

## Use OmniCode as a permanent OpenCode plugin

If you want OmniCode available in your normal `opencode` installation you can load it as a regular OpenCode plugin instead of going through the `omnicode` launcher.

### Recommended vs permanent-plugin mode

| Mode | Isolation | When to use |
| --- | --- | --- |
| `omnicode` launcher (recommended) | Isolated config and plugin loading. Does not affect normal `opencode`. | Default for almost everyone. |
| Permanent plugin | Loaded into your normal OpenCode config. No isolation. | You want Omni workflow available in every `opencode` session. |

### Permanent plugin from an OmniCode install

After installing OmniCode, point your normal OpenCode config at the bundled plugin file.

Typical plugin paths:

- macOS / Linux: `~/.local/share/omnicode/lib/plugin/index.js`
- Windows: `%LOCALAPPDATA%\OmniCode\lib\plugin\index.js`

Edit `~/.config/opencode/opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    "file:///ABSOLUTE/PATH/TO/omnicode/lib/plugin/index.js"
  ]
}
```

Example on macOS/Linux:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    "file:///Users/you/.local/share/omnicode/lib/plugin/index.js"
  ]
}
```

To make OmniCode the default agent in normal OpenCode as well:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "default_agent": "omnicode",
  "plugin": [
    "file:///Users/you/.local/share/omnicode/lib/plugin/index.js"
  ]
}
```

### Permanent plugin from a source checkout

If you are developing locally, build the plugin first:

```bash
git clone https://github.com/edgyarmati/omnicode
cd omnicode
npm install
npm run build
```

Then point OpenCode at the built plugin:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    "file:///ABSOLUTE/PATH/TO/omnicode/packages/plugin/dist/index.js"
  ]
}
```

### Caveat

Permanent-plugin mode is supported but is not the main OmniCode path. The `omnicode` launcher remains the recommended setup because it keeps OmniCode isolated from your normal OpenCode config, plugins, and defaults.

## Repo hygiene

`.omni/` is intentionally split into **durable** and **runtime** state.

Durable `.omni` files may be committed when they reflect real project intent:

- `PROJECT.md`, `SPEC.md`, `TASKS.md`, `TESTS.md`, `DECISIONS.md`, `STANDARDS.md`, `SKILLS.md`, `CONFIG.md`, `VERSION`, `.gitignore`

Runtime/generated `.omni` files stay out of git by default:

- `STATE.md`, `SESSION-SUMMARY.md`, `REPO-MAP.md`, `REPO-MAP.json`

`.pi/` also stays out of git.

## Troubleshooting

- Testing from a checkout — use `./scripts/setup` rather than the release installer.
- Managed OpenCode runtime install fails — rerun `omnicode` and follow the printed fallback command using the same `--prefix` path.
- Native launcher verification fails during install — the installer automatically falls back to `npx omnicode@latest setup` when available.
- Installer download fails — confirm the tagged release contains the expected assets listed in [`docs/release-checklist.md`](docs/release-checklist.md).

## Development

```bash
./scripts/setup
npm run check
npm test
```

## Packages

- [`packages/plugin`](packages/plugin) — `@omnicode/plugin`, the OpenCode plugin.
- [`packages/launcher`](packages/launcher) — `omnicode`, the launcher CLI.

## Repository layout

```
.
├── packages/
│   ├── plugin/       # @omnicode/plugin (OpenCode plugin)
│   └── launcher/     # omnicode launcher CLI
├── scripts/
│   ├── setup         # contributor bootstrap
│   └── release/      # release bundle helpers
├── install.sh        # public macOS/Linux installer
├── install.ps1       # public Windows installer
├── docs/             # design docs and release runbook
└── AGENTS.md         # guidance for agents working in this repo
```

## See also

- [`AGENTS.md`](AGENTS.md) — architecture, implemented behavior, and guidance for agents working on this repo.
- [`docs/2026-04-24-omnicode-design.md`](docs/2026-04-24-omnicode-design.md) — original OmniCode design record.
- [`docs/2026-04-24-native-launcher-design.md`](docs/2026-04-24-native-launcher-design.md) — native launcher design record.
- [`docs/2026-04-24-release-setup-design.md`](docs/2026-04-24-release-setup-design.md) — release setup design record.
- [`docs/implementation-plan.md`](docs/implementation-plan.md) — phased implementation plan.
- [`docs/release-checklist.md`](docs/release-checklist.md) — release runbook.
