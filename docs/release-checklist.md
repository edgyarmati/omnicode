# Release Checklist

## Pre-release

- [ ] all tests pass: `npm test`
- [ ] type check passes: `npm run check`
- [ ] local bundle builds cleanly: `bash scripts/release/bundle.sh`

## Version bump

- [ ] update `OMNICODE_BINARY_VERSION` in `packages/launcher/src/release.js`
- [ ] update `version` in `package.json`
- [ ] update `version` in `packages/launcher/package.json`
- [ ] update `version` in `packages/plugin/package.json`
- [ ] update `VERSION` default in `install.sh` and `install.ps1`
- [ ] commit: `chore: bump version to X.Y.Z`

## Tag and push

- [ ] `git tag vX.Y.Z`
- [ ] `git push origin main --tags`

## Verify CI

- [ ] release workflow completes (single job: build-and-release)
- [ ] release assets exist:
  - `omnicode-X.Y.Z.tar.gz`
  - `SHA256SUMS`

## Post-release smoke test

- [ ] macOS:
  ```sh
  OMNICODE_VERSION=X.Y.Z bash install.sh
  omnicode
  ```
- [ ] Windows (PowerShell):
  ```powershell
  $env:OMNICODE_VERSION = 'X.Y.Z'; irm https://github.com/edgyarmati/omnicode/releases/latest/download/install.ps1 | iex
  omnicode
  ```
- [ ] verify managed OpenCode installs and launches
- [ ] verify plugin loads (agent name is `omnicode`)
