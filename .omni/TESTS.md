# Tests

## Checks

- [x] `npm run check`
- [x] `npm run build`
- [x] `npm test`
- [x] verify `session.created` always sets Omni mode to `on`
- [x] verify agent instructions state Omni mode is always on
- [x] verify agent instructions say to bootstrap first on fresh projects
- [x] verify README Quick Usage shows conversational usage
- [ ] verify `scripts/setup` attempts to install RTK
- [ ] verify RTK command rewriting rewrites known commands and skips unknown ones
- [ ] verify RTK rewriting is a no-op when RTK is not available
- [ ] verify agent instructions mention RTK
- [ ] verify README mentions RTK integration

## Expected outcomes

- build and tests stay green
- RTK integration is transparent — if RTK is absent, OmniCode works normally
- if RTK is present, bash commands to supported tools are automatically compressed
