#!/usr/bin/env bash
set -euo pipefail

PACKAGE_NAME="omnicode"
MINIMUM_NODE_MAJOR=22

info() {
  printf '==> %s\n' "$1"
}

fail() {
  printf 'Error: %s\n' "$1" >&2
  exit 1
}

if ! command -v node >/dev/null 2>&1; then
  fail "Node.js is required but was not found. Install Node.js ${MINIMUM_NODE_MAJOR}+ and rerun this installer."
fi

NODE_VERSION="$(node --version 2>/dev/null || true)"
NODE_MAJOR="$(printf '%s' "$NODE_VERSION" | sed -E 's/^v?([0-9]+).*/\1/')"

if [[ -z "$NODE_MAJOR" || ! "$NODE_MAJOR" =~ ^[0-9]+$ ]]; then
  fail "Could not determine your Node.js version from '$NODE_VERSION'. Please install Node.js ${MINIMUM_NODE_MAJOR}+ and try again."
fi

if (( NODE_MAJOR < MINIMUM_NODE_MAJOR )); then
  fail "Node.js ${MINIMUM_NODE_MAJOR}+ is required, but found ${NODE_VERSION}. Please upgrade Node and rerun this installer."
fi

if ! command -v npm >/dev/null 2>&1; then
  fail "npm is required but was not found. Install npm for your Node.js setup and rerun this installer."
fi

info "Installing OmniCode globally from npm"
npm install -g "$PACKAGE_NAME"

if ! command -v omnicode >/dev/null 2>&1; then
  fail "OmniCode installed, but the 'omnicode' command was not found on PATH. You may need to restart your shell or add npm's global bin directory to PATH."
fi

info "OmniCode installed successfully"
printf '\nNext step:\n'
printf '  omnicode\n\n'
printf 'On first launch, OmniCode will create its isolated OpenCode config and attempt to install OpenCode if needed.\n'
