# Spec

## Problem

OmniCode needs a release-ready installation story that works cleanly across macOS, Linux, and Windows without depending on npm/npx as the primary user bootstrap path.

## Requested Behavior

- ship OmniCode as a standalone launcher binary per platform
- provide platform-native installers (`install.sh` and `install.ps1`)
- have `omnicode` manage one OmniCode-owned OpenCode runtime per user
- have OmniCode acquire a pinned default compatible upstream OpenCode version and upgrade that managed runtime when required
- keep the user's normal `opencode` installation untouched by default

## Constraints

- OpenCode remains the upstream host product
- OmniCode should orchestrate OpenCode, not fork or bundle-maintain it
- use one per-user managed OpenCode runtime, not per-project overrides
- keep provider/auth concerns out of the installer

## Success Criteria

- a user can install OmniCode on macOS, Linux, or Windows and run `omnicode`
- OmniCode works without requiring Node/npm/npx as a prerequisite for end users
- OmniCode acquires and reuses a compatible per-user OpenCode runtime automatically
- the user's normal `opencode` setup remains separate and untouched
