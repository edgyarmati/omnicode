# Decisions

- Commit durable `.omni` files that reflect stable project intent, standards, planning, and configuration.
- Ignore runtime/generated `.omni` files by default: `STATE.md`, `SESSION-SUMMARY.md`, `REPO-MAP.md`, and `REPO-MAP.json`.
- Generate the selective ignore policy as `.omni/.gitignore` during bootstrap so new projects inherit the same behavior.
- Use a split release setup model: `scripts/install.sh` is the public one-command installer, `npx omnicode@latest setup` is the underlying bootstrap path, npm global install is the documented fallback, and `scripts/setup` prepares a local checkout and links `omnicode` for contributor/pre-release use.
