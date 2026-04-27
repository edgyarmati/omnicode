#!/usr/bin/env bash
# OmniCode installer — works on macOS and Linux.
# Requires: curl, tar, Node.js >= 22
#
# Usage:
#   curl -fsSL https://github.com/edgyarmati/omnicode/releases/latest/download/install.sh | bash
#   # or pin a version:
#   OMNICODE_VERSION=0.3.0 curl -fsSL ... | bash
set -euo pipefail

REPO_SLUG="edgyarmati/omnicode"
VERSION="${OMNICODE_VERSION:-0.3.0}"
DATA_DIR="${OMNICODE_DATA_DIR:-$HOME/.local/share/omnicode}"
BIN_DIR="${OMNICODE_BIN_DIR:-$HOME/.local/bin}"
MINIMUM_NODE_MAJOR=22

info()  { printf '==> %s\n' "$1"; }
warn()  { printf 'Warning: %s\n' "$1" >&2; }
fail()  { printf 'Error: %s\n' "$1" >&2; exit 1; }

# ── Detect platform ──────────────────────────────────────────────────────────

platform_os() {
  case "$(uname -s)" in
    Darwin) printf 'darwin' ;;
    Linux)  printf 'linux' ;;
    *)      fail "Unsupported OS: $(uname -s)" ;;
  esac
}

# ── Check prerequisites ──────────────────────────────────────────────────────

if ! command -v curl >/dev/null 2>&1; then
  fail "curl is required. Install it and rerun."
fi
if ! command -v tar >/dev/null 2>&1; then
  fail "tar is required. Install it and rerun."
fi

# ── Check Node.js ────────────────────────────────────────────────────────────

if ! command -v node >/dev/null 2>&1; then
  cat >&2 <<EOF
Error: Node.js ${MINIMUM_NODE_MAJOR}+ is required but not found.

Install Node.js:
  macOS:  brew install node
  Linux:  curl -fsSL https://fnm/install.sh | bash && fnm install --lts
  Or visit: https://nodejs.org

Then rerun this installer.
EOF
  exit 1
fi

NODE_MAJOR=$(node -e "console.log(process.version.replace(/^v/, '').split('.')[0])" 2>/dev/null || echo "0")
if [ "$NODE_MAJOR" -lt "$MINIMUM_NODE_MAJOR" ]; then
  fail "Node.js ${MINIMUM_NODE_MAJOR}+ is required, but found $(node -v). Please upgrade."
fi

# ── Download and extract ─────────────────────────────────────────────────────

mkdir -p "$DATA_DIR" "$BIN_DIR"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

ASSET_NAME="omnicode-${VERSION}.tar.gz"
ASSET_URL="https://github.com/${REPO_SLUG}/releases/download/v${VERSION}/${ASSET_NAME}"
SUMS_URL="https://github.com/${REPO_SLUG}/releases/download/v${VERSION}/SHA256SUMS"
ARCHIVE="$TMP_DIR/${ASSET_NAME}"
SUMS_FILE="$TMP_DIR/SHA256SUMS"

info "Downloading OmniCode v${VERSION}"
curl -fsSL "$ASSET_URL" -o "$ARCHIVE" || fail "Download failed. Check that v${VERSION} exists at ${ASSET_URL}"

info "Verifying SHA256 checksum"
curl -fsSL "$SUMS_URL" -o "$SUMS_FILE" \
  || fail "Could not fetch SHA256SUMS for v${VERSION}. Refusing to install an unverified archive."

# Locate a sha256 verifier
if command -v sha256sum >/dev/null 2>&1; then
  SHA_CMD="sha256sum"
elif command -v shasum >/dev/null 2>&1; then
  SHA_CMD="shasum -a 256"
else
  fail "Need sha256sum or shasum to verify the download. Install one and rerun."
fi

EXPECTED_HASH="$(awk -v name="${ASSET_NAME}" '$2 == name || $2 == "*"name {print $1; exit}' "$SUMS_FILE")"
if [ -z "$EXPECTED_HASH" ]; then
  fail "SHA256SUMS does not contain an entry for ${ASSET_NAME}."
fi

ACTUAL_HASH="$(${SHA_CMD} "$ARCHIVE" | awk '{print $1}')"
if [ "$EXPECTED_HASH" != "$ACTUAL_HASH" ]; then
  fail "Checksum mismatch for ${ASSET_NAME}. Expected ${EXPECTED_HASH}, got ${ACTUAL_HASH}."
fi
info "Checksum OK"

info "Extracting to ${DATA_DIR}"
tar -xzf "$ARCHIVE" -C "$TMP_DIR"

# The tarball contains omnicode-VERSION/...
SRC_DIR="$TMP_DIR/omnicode-${VERSION}"
if [ ! -d "$SRC_DIR" ]; then
  fail "Unexpected archive layout — expected omnicode-${VERSION}/ directory inside tarball"
fi

# Remove previous install, replace with new
rm -rf "${DATA_DIR}/lib"
cp -R "$SRC_DIR" "${DATA_DIR}/lib"
info "Installed to ${DATA_DIR}/lib"

# ── Create shell wrapper ─────────────────────────────────────────────────────

WRAPPER="${BIN_DIR}/omnicode"
cat > "$WRAPPER" <<WRAPPER_EOF
#!/usr/bin/env bash
exec node "${DATA_DIR}/lib/bin/omnicode.js" "\$@"
WRAPPER_EOF
chmod +x "$WRAPPER"

info "Created launcher at ${WRAPPER}"

# ── Verify ───────────────────────────────────────────────────────────────────

if ! node "${DATA_DIR}/lib/bin/omnicode.js" --check >/dev/null 2>&1; then
  # Fall back to syntax-only validation if the launcher check path changes.
  if ! node --check "${DATA_DIR}/lib/bin/omnicode.js" 2>/dev/null; then
    fail "Launcher script has syntax errors. Something went wrong with the install."
  fi
fi

info "OmniCode v${VERSION} installed successfully"
printf '\n'
printf 'Next step:\n'
printf '  omnicode\n\n'
if ! command -v omnicode >/dev/null 2>&1; then
  printf 'Add %s to your PATH if not already there.\n' "$BIN_DIR"
  printf '  export PATH="%s:\$PATH"\n' "$BIN_DIR"
fi
