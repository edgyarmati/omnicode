# Tests

## Checks

- [x] `npm run check`
- [x] `npm run build`
- [x] `npm test`
- [ ] verify `.omni/.gitignore` ignores runtime state but allows durable files

## Expected outcomes

- build and tests stay green
- `.omni/STATE.md`, `.omni/SESSION-SUMMARY.md`, and repo-map files are ignored
- durable `.omni` files remain trackable
