---
description: Turn Omni mode on or off for the current project
agent: omnicode
---
Interpret the user's desired mode from `$ARGUMENTS`.

Then:
- use `omnicode_set_mode`
- confirm the new mode
- if turning Omni mode on, ensure `.omni/` exists and summarize the next workflow step
- if turning Omni mode off, explain that `.omni/` remains as passive project context
