# Tests

## Checks

- [x] `npm run check`
- [x] `npm run build`
- [x] `npm test`
- [x] verify installer scaffolding and release asset naming for macOS/Linux/Windows
- [x] verify managed-runtime path and version helper behavior
- [x] verify release workflow/build-script/checklist scaffolding exists and is wired to expected artifact names
- [ ] verify macOS/Linux installer downloads and installs the correct launcher artifact from a real tag
- [ ] verify Windows installer downloads and installs the correct launcher artifact from a real tag
- [x] verify first-run `omnicode` acquires the managed OpenCode runtime on a clean machine
- [x] verify repeat runs reuse the managed runtime when already compatible
- [ ] verify a higher required OpenCode target upgrades the managed runtime
- [ ] verify normal user-installed `opencode` remains untouched

## Expected outcomes

- build and tests stay green
- installer and runtime metadata scaffolding are stable and consistent
- platform installers will leave the user with a working `omnicode` command once real binaries are published
- OmniCode will manage one compatible OpenCode runtime per user automatically once acquisition is wired up
- the user's normal `opencode` installation remains separate
