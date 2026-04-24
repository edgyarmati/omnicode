# Decisions

- Commit durable `.omni` files that reflect stable project intent, standards, planning, and configuration.
- Ignore runtime/generated `.omni` files by default: `STATE.md`, `SESSION-SUMMARY.md`, `REPO-MAP.md`, and `REPO-MAP.json`.
- Generate the selective ignore policy as `.omni/.gitignore` during bootstrap so new projects inherit the same behavior.
