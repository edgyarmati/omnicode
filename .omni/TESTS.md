# Tests

## Checks

- [x] `npm run check`
- [x] `npm run build`
- [x] `npm test`
- [x] verify repo-local setup succeeds from a fresh checkout state
- [x] verify install docs are runnable and consistent with package/bin metadata
- [ ] smoke-test first-run `omnicode` behavior after setup

## Expected outcomes

- build and tests stay green
- setup script installs/builds the project successfully and leaves `omnicode` available locally
- install path leaves the user with a working `omnicode` command
- first-run launcher behavior still creates isolated OpenCode config and handles missing OpenCode clearly
