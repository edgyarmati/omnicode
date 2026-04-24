# Decisions

- Commit durable `.omni` files that reflect stable project intent, standards, planning, and configuration.
- Ignore runtime/generated `.omni` files by default: `STATE.md`, `SESSION-SUMMARY.md`, `REPO-MAP.md`, and `REPO-MAP.json`.
- Generate the selective ignore policy as `.omni/.gitignore` during bootstrap so new projects inherit the same behavior.
- Pivot the release strategy away from npm/npx-first bootstrap toward a standalone OmniCode launcher binary with platform-native installers.
- OmniCode will manage one per-user upstream OpenCode runtime by default, using a pinned tested default version with optional future upgrades.
- OmniCode should keep the user's normal global `opencode` installation untouched rather than automatically reusing or mutating it.
