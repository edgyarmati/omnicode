---
description: Configure optional OmniCode native sub-agents
agent: omnicode
---
Interpret the user's desired `/omni-agents` action from `$ARGUMENTS`.

Supported actions:

- `status`: call `omnicode_agents_status` and summarize global, project, and effective settings.
- `on`: call `omnicode_update_agents_settings` with `enabled: true` and `scope: "global"`.
- `off`: call `omnicode_update_agents_settings` with `enabled: false` and `scope: "global"`.
- `on --project`: call `omnicode_update_agents_settings` with `enabled: true` and `scope: "project"`.
- `off --project`: call `omnicode_update_agents_settings` with `enabled: false` and `scope: "project"`.
- `setup`: run the guided setup walkthrough below.

If no action is provided, show `status` first and then ask whether the user wants `on`, `off`, or `setup`.

For `setup`:

1. Call `omnicode_agents_status`.
2. Call `omnicode_read_model_recommendations` and read any guidance from `model-recommendations.md`.
3. Try to inspect available OpenCode models with bash command `opencode models`. If the command fails, explain that model choices can still be entered manually as `<provider>/<model>` strings.
4. Walk the user through setup one question at a time:
   - enable native OmniCode sub-agents?
   - write global settings or project override?
   - use the invoking/orchestrator model for sub-agents, or choose a shared default model?
   - optionally choose per-agent models for `omni-explorer`, `omni-planner`, `omni-verifier`, and `omni-worker`.
5. Explain the orchestration model before recommending models: OmniCode uses a single-writer invariant. The primary `omnicode` agent remains the active-worktree writer and decision owner; subagents are primarily read-only intelligence contributors. `omni-worker` is exceptional, one-slice-only, and not a casual parallel writer mode.
6. Recommend sensible models using, in order:
    - project `model-recommendations.md`
    - global `model-recommendations.md`
    - visible `opencode models` output
    - general heuristics: cheaper/faster for `omni-explorer`, stronger reasoning for `omni-planner` smart-friend critique, reliable/tool-capable for `omni-verifier` clean-context review/checks, and strongest coding model for exceptional `omni-worker` use.
7. Call `omnicode_update_agents_settings` with only the selected values. Do not write bundled prompt/default agent definitions into settings.
8. Explain that settings take effect after OpenCode reloads plugin configuration (usually a new OmniCode/OpenCode session).

Keep `.omni/` for workflow memory only. Agent settings live in `~/.omnicode/settings.json` by default, with optional project overrides in `.omnicode/settings.json` that are gitignored.
