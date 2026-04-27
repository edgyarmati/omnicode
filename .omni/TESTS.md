# Tests

## Checks

- [x] `npm run check` after each implementation slice
- [x] `npm test` after each implementation slice
- [x] Atomic helper preserves permissions on replacement
- [x] Representative plugin `.omni` write uses atomic helper successfully
- [ ] Sanitizers collapse unsafe multi-line markdown/tool text into safe generated output
- [ ] Standards import handles embedded code fences/headings without breaking output structure
- [ ] Launcher semver comparison handles stable vs prerelease and prerelease identifier ordering

## Expected outcomes

- Existing behavior remains compatible for normal inputs.
- Hardening tests fail on the old direct/unsafe behavior and pass after the backport.
- No source slice is committed until check and test pass.
