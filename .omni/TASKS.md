# Tasks

## Planned slices

- [x] Slice 1: add shared atomic write helper and route generated `.omni` / launcher metadata writes through it
- [x] Slice 2: sanitize generated markdown/state/session-summary/skills/standards/repo-map fragments and add regression tests
- [x] Slice 3: harden launcher semver comparison for prerelease/build metadata and add tests
- [ ] Slice 4: evaluate and apply a bounded repo-map hardening/performance improvement if still separate from Slice 1

## Notes

- Commit each verified slice before starting the next one.
- Prefer narrow backports that match OmniCode's simpler architecture rather than copying Omni-Pi internals wholesale.
