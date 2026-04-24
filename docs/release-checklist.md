# OmniCode Release Checklist

Use this checklist for each public release.

## 1) Prepare version metadata

- [ ] bump root `package.json` version
- [ ] bump `packages/launcher/package.json` version
- [ ] bump `packages/plugin/package.json` version
- [ ] update `packages/launcher/src/release.js`
  - [ ] `OMNICODE_BINARY_VERSION`
  - [ ] `OPENCODE_VERSION_TARGET` (if changed)
- [ ] ensure `install.sh` and `install.ps1` default `OMNICODE_VERSION` match the release

## 2) Verify locally

- [ ] `npm run check`
- [ ] `npm run build`
- [ ] `npm test`
- [ ] `node packages/launcher/bin/omnicode.js --help`
- [ ] confirm managed runtime metadata at:
  - macOS: `~/Library/Application Support/omnicode/runtimes/opencode/current.json`
  - Linux: `${XDG_DATA_HOME:-~/.local/share}/omnicode/runtimes/opencode/current.json`
  - Windows: `%LOCALAPPDATA%\OmniCode\runtimes\opencode\current.json`

## 3) Tag and publish

- [ ] create and push tag: `vX.Y.Z`
- [ ] verify GitHub Action `Release` completed
- [ ] verify assets exist in the release:
  - `omnicode-X.Y.Z-darwin-x64.tar.gz`
  - `omnicode-X.Y.Z-darwin-arm64.tar.gz`
  - `omnicode-X.Y.Z-linux-x64.tar.gz`
  - `omnicode-X.Y.Z-linux-arm64.tar.gz`
  - `omnicode-X.Y.Z-windows-x64.zip`
  - `omnicode-X.Y.Z-windows-arm64.zip`
  - `SHA256SUMS`

## 4) Post-release smoke

- [ ] macOS/Linux installer:
  - `curl -fsSL https://raw.githubusercontent.com/edgyarmati/omnicode/main/install.sh | bash`
- [ ] Windows installer:
  - `irm https://raw.githubusercontent.com/edgyarmati/omnicode/main/install.ps1 | iex`
- [ ] run `omnicode --help`
- [ ] run `omnicode agent list`
- [ ] verify first run installs/reuses managed OpenCode runtime

## 5) Documentation

- [ ] update README install examples if needed
- [ ] append release note summary to docs/changelog (if/when added)
