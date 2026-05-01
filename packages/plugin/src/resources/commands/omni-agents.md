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
5. Recommend sensible models using, in order:
   - project `model-recommendations.md`
   - global `model-recommendations.md`
   - visible `opencode models` output
   - general heuristics: cheaper/faster for `omni-explorer`, stronger reasoning for `omni-planner`, reliable/tool-capable for `omni-verifier`, and strongest coding model for `omni-worker`.
6. Call `omnicode_update_agents_settings` with only the selected values. Do not write bundled prompt/default agent definitions into settings.
7. Explain that settings take effect after OpenCode reloads plugin configuration (usually a new OmniCode/OpenCode session).

Keep `.omni/` for workflow memory only. Agent settings live in `~/.omnicode/settings.json` by default, with optional project overrides in `.omnicode/settings.json` that are gitignored.
