# Tasks

## Planned slices

- [x] Define the release install contract for curl installer, npm fallback, and repo-local setup
- [x] Add a public installer script under `scripts/install.sh`
- [x] Add a repo-local contributor setup script under `scripts/setup`
- [x] Adjust package/bin metadata for release installation if needed
- [x] Update README with release install, fallback, and troubleshooting steps
- [x] Add tests and smoke-checks for setup/install behavior

## Notes

The installer handles distribution and prerequisite checks. The launcher still owns first-run OpenCode config/bootstrap behavior.
