# Tasks

## Planned slices

- [x] Design and implement a standalone OmniCode launcher binary build/publish pipeline scaffold (GitHub release workflow + build script + checklist)
- [x] Add platform-native installer scaffolding: `install.sh` for macOS/Linux and `install.ps1` for Windows
- [x] Add a per-user managed OpenCode runtime location and version metadata helpers
- [x] Implement managed OpenCode acquisition and version checks in the launcher (current mechanism: npm prefix install into managed runtime paths)
- [x] Keep isolated OmniCode config/plugin wiring for managed OpenCode launches
- [x] Update docs and tests for the native-launcher install model

## Notes

The native release operations scaffold is now in place: workflow, build script, installer naming alignment, and release checklist. Remaining work is validating the first real tagged release artifacts and adding release-artifact-based managed OpenCode download/integrity checks.
