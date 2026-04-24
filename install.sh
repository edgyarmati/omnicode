#!/usr/bin/env bash
set -euo pipefail

REPO_SLUG="edgyarmati/omnicode"
INSTALL_DIR="${OMNICODE_INSTALL_DIR:-$HOME/.local/bin}"
VERSION="${OMNICODE_VERSION:-0.1.0}"

info() {
  printf '==> %s\n' "$1"
}

fail() {
  printf 'Error: %s\n' "$1" >&2
  exit 1
}

platform() {
  case "$(uname -s)" in
    Darwin) printf 'darwin' ;;
    Linux) printf 'linux' ;;
    *) fail "Unsupported platform: $(uname -s). Use a supported OmniCode release artifact manually." ;;
  esac
}

arch() {
  case "$(uname -m)" in
    x86_64|amd64) printf 'x64' ;;
    arm64|aarch64) printf 'arm64' ;;
    *) fail "Unsupported architecture: $(uname -m)." ;;
  esac
}

asset_ext() {
  printf 'tar.gz'
}

build_asset_url() {
  local os arch ext asset
  os="$(platform)"
  arch="$(arch)"
  ext="$(asset_ext)"
  asset="omnicode-${VERSION}-${os}-${arch}.${ext}"

  printf 'https://github.com/%s/releases/download/v%s/%s' "$REPO_SLUG" "$VERSION" "$asset"
}

if ! command -v curl >/dev/null 2>&1; then
  fail "curl is required to install OmniCode."
fi

if ! command -v tar >/dev/null 2>&1; then
  fail "tar is required to extract OmniCode."
fi

mkdir -p "$INSTALL_DIR"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

ASSET_URL="$(build_asset_url)"
ARCHIVE_PATH="$TMP_DIR/omnicode.tar.gz"

info "Downloading OmniCode from $ASSET_URL"
curl -fsSL "$ASSET_URL" -o "$ARCHIVE_PATH"

info "Extracting OmniCode into $INSTALL_DIR"
tar -xzf "$ARCHIVE_PATH" -C "$TMP_DIR"
install -m 0755 "$TMP_DIR/omnicode" "$INSTALL_DIR/omnicode"

if ! "$INSTALL_DIR/omnicode" --help >/dev/null 2>&1; then
  printf 'Warning: native launcher verification failed. Falling back to npm/npx bootstrap path.\n' >&2
  if command -v npx >/dev/null 2>&1; then
    npx omnicode@latest setup
    info "OmniCode installed through fallback bootstrap"
    exit 0
  fi
  fail "OmniCode native launcher failed to start and npx is not available for fallback bootstrap."
fi

info "OmniCode installed successfully"
printf '\nNext step:\n'
printf '  omnicode\n\n'
printf 'If your shell cannot find omnicode yet, add %s to PATH.\n' "$INSTALL_DIR"
