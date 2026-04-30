# OmniCode

Give your coding agent a memory and a process. OmniCode layers a plan-before-you-edit workflow and durable project memory on top of [OpenCode](https://opencode.ai) — so sessions stop forgetting, and the agent stops charging ahead without a plan.

## Install

OmniCode currently ships as a JavaScript bundle and requires Node.js 22 or newer.

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

Your existing `opencode` install is left alone — OmniCode runs in its own sandbox.

### From a local checkout

```bash
git clone https://github.com/edgyarmati/omnicode
cd omnicode
./scripts/setup
omnicode
```

## What you get

- **Durable project memory** in `.omni/` — spec, tasks, tests, decisions, standards, and session summaries stay on disk between runs.
- **Automatic grilling before changes** — for new features, fixes, refactors, and behavior changes, OmniCode asks one focused question at a time until the request is unambiguous.
- **Skill-fit checkpoint** — after clarification, OmniCode checks whether available skills cover the task, uses `find-skills` when relevant skills are missing, and can create a project-local skill when none exists.
- **Plan before edit** — when Omni mode is on, the agent can't touch your files until `SPEC.md`, `TASKS.md`, and `TESTS.md` have real content.
- **Repo awareness** — a ranked repo map keeps the agent oriented in large codebases.
- **Skill discovery and local creation** — relevant skills are surfaced and loaded automatically; if discovery cannot find a fit, OmniCode can write a narrow local skill under `.omni/skills/` without touching global user skills.
- **Collaboration-safe memory direction** — shared project knowledge stays durable, while active work is moving toward per-branch `.omni/work/<branch>/` plans and protected-branch guardrails.
- **Token savings** — RTK is installed and wired up automatically, compressing bash command output by 60-90% so the agent uses fewer tokens on git, ls, test runs, and more.
- **Zero impact on your normal setup** — the `omnicode` launcher uses its own isolated config, so regular `opencode` keeps working exactly as before.

OpenCode still owns the terminal UI, models, providers, auth, sessions, tools, and runtime. OmniCode only adds the workflow layer.

## The Omni workflow

1. **Bootstrap** — `.omni/` is seeded in your project the first time you run OmniCode there.
2. **Grill** — for change requests, clarify one question at a time until behavior, constraints, non-goals, tests, and success criteria are concrete.
3. **Check skills** — judge whether bundled/project skills cover the clarified task; if not, use `find-skills`, then create a project-local `.omni/skills/` skill with `skill-maker` when no adequate skill exists.
4. **Plan** — write real `SPEC.md`, `TASKS.md`, and `TESTS.md`. Until you do, the edit/write guard is active.
5. **Execute** — work bounded task slices guided by the plan.
6. **Verify** — state and session summaries are updated through OmniCode tools so the next run picks up where you left off.

For collaborative repositories, see the planned per-branch work-memory model in [`docs/2026-04-30-collaborative-memory-design.md`](docs/2026-04-30-collaborative-memory-design.md).

`.omni/STATE.md` is also injected into OpenCode's compaction context, so active state survives long sessions.

## Quick usage

```bash
omnicode
```

Then just talk to it. For example:

> "Bootstrap this project and tell me what we're working with."

> "Add a dark mode toggle to the settings page."

> "Review the auth flow for security issues."

OmniCode will bootstrap `.omni/` automatically on first use in a new project, then follow a plan → implement → verify workflow for every task. You don't need to pass inline prompts or CLI flags — just open it and have a conversation.

Replace `<provider>/<model>` with any model identifier OpenCode supports (for example, `opencode/hy3-preview-free`).

---

## Contents

- [How isolation works](#how-isolation-works)
- [Use OmniCode as a permanent OpenCode plugin](#use-omnicode-as-a-permanent-opencode-plugin)
- [Repo hygiene](#repo-hygiene)
- [Troubleshooting](#troubleshooting)
- [Development](#development)
- [Packages and layout](#packages-and-layout)
- [See also](#see-also)

## How isolation works

The `omnicode` launcher starts OpenCode with an OmniCode-specific config home so it does not inherit your normal OpenCode plugins or config:

- `XDG_CONFIG_HOME=~/.config/omnicode`
- `OPENCODE_CONFIG=~/.config/omnicode/opencode/opencode.json`
- `OPENCODE_CONFIG_DIR=~/.config/omnicode/opencode`
- `OPENCODE_CLIENT=omnicode`

Both `omnicode` and your regular `opencode` use the same underlying OpenCode binary — they just point at different config roots.

OmniCode behavior settings are resolved from:

- global user settings: `~/.omnicode/settings.json`
- optional project-local override: `.omnicode/settings.json`

The current workflow policy supports protected-branch settings such as `workflow.protectedBranches`, `workflow.requireFeatureBranchForChanges`, and `workflow.allowProtectedBranchChanges`. When feature branches are required, OmniCode blocks source edits and mutating shell commands on protected branches such as `main`/`master` unless an explicit settings override allows them.

## Use OmniCode as a permanent OpenCode plugin

If you'd rather have OmniCode available in every `opencode` session, you can load it as a regular plugin instead of going through the `omnicode` launcher. This trades isolation for always-on availability.

| Mode | Isolation | When to use |
| --- | --- | --- |
| `omnicode` launcher (recommended) | Fully isolated config and plugin loading. | The default for almost everyone. |
| Permanent plugin | None — OmniCode becomes part of your normal OpenCode setup. | You want the Omni workflow in every `opencode` session. |

### From an OmniCode install

After installing OmniCode, point your normal OpenCode config at the bundled plugin file.

Typical plugin paths:

- macOS / Linux: `~/.local/share/omnicode/lib/plugin/index.js`
- Windows: `%LOCALAPPDATA%\OmniCode\lib\plugin\index.js`

Edit `~/.config/opencode/opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    "file:///Users/you/.local/share/omnicode/lib/plugin/index.js"
  ]
}
```

To make OmniCode the default agent there as well:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "default_agent": "omnicode",
  "plugin": [
    "file:///Users/you/.local/share/omnicode/lib/plugin/index.js"
  ]
}
```

### From a source checkout

Build the plugin first:

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

The `omnicode` launcher is still the recommended path — permanent-plugin mode is supported but skips the isolation you get for free otherwise.

## Repo hygiene

`.omni/` is intentionally split into **durable** and **runtime** state.

Commit these when they reflect real project intent:

- `PROJECT.md`, `SPEC.md`, `TASKS.md`, `TESTS.md`, `DECISIONS.md`, `STANDARDS.md`, `SKILLS.md`, `CONFIG.md`, `VERSION`, `.gitignore`

These stay out of git — they're regenerated each run:

- `STATE.md`, `SESSION-SUMMARY.md`, `REPO-MAP.md`, `REPO-MAP.json`

`.pi/` also stays out of git.

## Troubleshooting

- **Testing from a checkout** — use `./scripts/setup` rather than the release installer.
- **Managed OpenCode install fails** — rerun `omnicode` and follow the printed fallback command using the same `--prefix` path.
- **Launcher verification fails during install** — rerun the installer with the same `OMNICODE_VERSION`; it verifies the extracted launcher with `omnicode --check` before creating the final wrapper.
- **Installer download fails** — confirm the tagged release contains the expected assets listed in [`docs/release-checklist.md`](docs/release-checklist.md).

## Development

```bash
./scripts/setup   # installs deps, builds, links launcher, installs RTK
npm run check
npm test
```

RTK is optional — OmniCode works without it. When present, bash tool calls to git, test runners, ls, grep, and other supported commands are automatically compressed for token savings.

Release artifacts are produced by `.github/workflows/release.yml` from tagged versions. See [`docs/release-checklist.md`](docs/release-checklist.md) for the release runbook.

## Packages and layout

- [`packages/plugin`](packages/plugin) — `@omnicode/plugin`, the OpenCode plugin.
- [`packages/launcher`](packages/launcher) — `omnicode`, the launcher CLI.

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
- [`docs/2026-04-30-collaborative-memory-design.md`](docs/2026-04-30-collaborative-memory-design.md) — collaboration-safe memory and protected-branch design.
- [`docs/implementation-plan.md`](docs/implementation-plan.md) — phased implementation plan.
- [`docs/release-checklist.md`](docs/release-checklist.md) — release runbook.
