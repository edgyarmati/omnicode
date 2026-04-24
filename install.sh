#!/usr/bin/env bash
# OmniCode installer — works on macOS and Linux.
# Requires: curl, tar, Node.js >= 22
#
# Usage:
#   curl -fsSL https://github.com/edgyarmati/omnicode/releases/latest/download/install.sh | bash
#   # or pin a version:
#   OMNICODE_VERSION=0.2.0 curl -fsSL ... | bash
set -euo pipefail

REPO_SLUG="edgyarmati/omnicode"
VERSION="${OMNICODE_VERSION:-0.2.0}"
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

ASSET_URL="https://github.com/${REPO_SLUG}/releases/download/v${VERSION}/omnicode-${VERSION}.tar.gz"
ARCHIVE="$TMP_DIR/omnicode.tar.gz"

info "Downloading OmniCode v${VERSION}"
curl -fsSL "$ASSET_URL" -o "$ARCHIVE" || fail "Download failed. Check that v${VERSION} exists at ${ASSET_URL}"

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

if ! node "${DATA_DIR}/lib/bin/omnicode.js" --help >/dev/null 2>&1; then
  # --help may not exist yet; just check the file parses
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
