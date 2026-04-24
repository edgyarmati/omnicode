# Tasks

## Planned slices

- [ ] Design and implement a standalone OmniCode launcher binary build pipeline
- [x] Add platform-native installer scaffolding: `install.sh` for macOS/Linux and `install.ps1` for Windows
- [x] Add a per-user managed OpenCode runtime location and version metadata helpers
- [ ] Implement upstream OpenCode acquisition and version checks in the launcher
- [x] Keep isolated OmniCode config/plugin wiring for managed OpenCode launches
- [x] Update docs and tests for the native-launcher install model

## Notes

The foundation is now in place: release metadata exists, installers are scaffolded, and the launcher can target a managed OpenCode binary path. The remaining work is real binary publishing plus managed runtime download/update logic.
