#!/usr/bin/env bash
set -euo pipefail

VERSION="${OMNICODE_VERSION:-${GITHUB_REF_NAME#v}}"
if [[ -z "$VERSION" || "$VERSION" == "$GITHUB_REF_NAME" ]]; then
  VERSION="0.1.0"
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DIST_DIR="$ROOT_DIR/dist"
BUILD_DIR="$DIST_DIR/build"

rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR" "$DIST_DIR"

build_target() {
  local target="$1"
  local os="$2"
  local arch="$3"
  local ext="$4"
  local bin_name="omnicode${ext}"
  local out_path="$BUILD_DIR/${bin_name}-${os}-${arch}${ext}"
  local stage_dir="$BUILD_DIR/stage-${os}-${arch}"

  echo "==> Building $target"
  npm exec --yes pkg -- packages/launcher/bin/omnicode.js --targets "$target" --output "$out_path"

  rm -rf "$stage_dir"
  mkdir -p "$stage_dir"
  cp "$out_path" "$stage_dir/$bin_name"

  if [[ "$ext" == ".exe" ]]; then
    (cd "$stage_dir" && zip -q "$DIST_DIR/omnicode-${VERSION}-${os}-${arch}.zip" "$bin_name")
  else
    tar -czf "$DIST_DIR/omnicode-${VERSION}-${os}-${arch}.tar.gz" -C "$stage_dir" "$bin_name"
  fi
}

build_target "node22-linux-x64" "linux" "x64" ""
build_target "node22-linux-arm64" "linux" "arm64" ""
build_target "node22-macos-x64" "darwin" "x64" ""
build_target "node22-macos-arm64" "darwin" "arm64" ""
build_target "node22-win-x64" "windows" "x64" ".exe"
build_target "node22-win-arm64" "windows" "arm64" ".exe"

echo "==> Computing checksums"
(
  cd "$DIST_DIR"
  shasum -a 256 omnicode-${VERSION}-* > SHA256SUMS
)

echo "==> Built release archives in $DIST_DIR"
ls -1 "$DIST_DIR" | sed 's/^/ - /'
