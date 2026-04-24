# Spec

## Problem

OmniCode needs a release-ready setup flow so a new user can install it with one command, then run `omnicode` and get a working session without manual config editing or repo-specific setup steps.

## Requested Behavior

- provide a headline one-command installer via `scripts/install.sh`
- support an npm-based fallback install path
- provide a repo-local `scripts/setup` path for contributors and pre-release testing
- keep runtime responsibility in the existing `omnicode` launcher so first run still creates isolated config and handles missing OpenCode

## Constraints

- OpenCode remains the host product
- keep the launcher thin and the plugin thick
- do not take over provider auth or global OpenCode config
- do not attempt full machine bootstrap such as auto-installing Node in v1

## Success Criteria

- a user can run the installer and then run `omnicode`
- package/bin metadata support the public install path cleanly
- contributor setup from a fresh checkout is documented and automated
- docs explain install, fallback, and troubleshooting clearly
