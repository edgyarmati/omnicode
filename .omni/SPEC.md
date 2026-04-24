# Spec

## Problem

The omnicode agent should always operate in Omni mode (no opt-in required), should auto-bootstrap new projects on first session, the README should reflect how agentic coding actually works, and RTK should be installed and integrated for token savings.

## Requested Behavior

1. **Omni mode always on**: when launched through the `omnicode` agent, Omni mode is always active. `session.created` forces Omni mode on.

2. **Auto-bootstrap on first session**: if `.omni/` does not exist yet when a session starts, the agent automatically bootstraps before doing anything else.

3. **README reflects agentic workflow**: the Quick Usage section shows that you run `omnicode` and then have a conversation.

4. **RTK integration**: the setup script installs RTK, the OmniCode plugin rewrites bash tool calls through RTK when available for 60-90% token savings, and the agent instructions mention RTK.

## Constraints

- RTK integration must degrade gracefully — if `rtk` is not on PATH, everything works normally without it.
- The plugin detects RTK availability once at init time and caches the result.
- Only rewrite commands that RTK is known to handle well. Unknown commands pass through unchanged.
- Do not remove the `omnicode_set_mode` tool (still useful for power users).

## Success Criteria

- `session.created` always sets Omni mode to `on`
- the omnicode agent instructions say Omni mode is always on and bootstrap first
- README Quick Usage shows conversational usage
- `scripts/setup` installs RTK (brew or curl)
- the OmniCode plugin rewrites bash tool calls through RTK when available
- agent instructions mention RTK
- existing tests still pass
