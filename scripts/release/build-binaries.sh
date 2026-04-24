#!/usr/bin/env bash
set -euo pipefail

VERSION="${OMNICODE_VERSION:-${GITHUB_REF_NAME#v}}"
if [[ -z "$VERSION" || "$VERSION" == "$GITHUB_REF_NAME" ]]; then
  VERSION="0.1.0"
fi

BUILD_SET="${BUILD_SET:-all}" # all | linux | darwin | windows

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
    if command -v zip >/dev/null 2>&1; then
      (cd "$stage_dir" && zip -q "$DIST_DIR/omnicode-${VERSION}-${os}-${arch}.zip" "$bin_name")
    else
      (
        cd "$stage_dir"
        powershell -NoProfile -Command "Compress-Archive -Path '$bin_name' -DestinationPath '$DIST_DIR/omnicode-${VERSION}-${os}-${arch}.zip' -Force"
      )
    fi
  else
    tar -czf "$DIST_DIR/omnicode-${VERSION}-${os}-${arch}.tar.gz" -C "$stage_dir" "$bin_name"
  fi
}

PKG_NODE_TARGET="${PKG_NODE_TARGET:-node18}"

if [[ "$BUILD_SET" == "all" || "$BUILD_SET" == "linux" ]]; then
  build_target "${PKG_NODE_TARGET}-linux-x64" "linux" "x64" ""
  build_target "${PKG_NODE_TARGET}-linux-arm64" "linux" "arm64" ""
fi

if [[ "$BUILD_SET" == "all" || "$BUILD_SET" == "darwin" ]]; then
  build_target "${PKG_NODE_TARGET}-macos-x64" "darwin" "x64" ""
  build_target "${PKG_NODE_TARGET}-macos-arm64" "darwin" "arm64" ""
fi

if [[ "$BUILD_SET" == "all" || "$BUILD_SET" == "windows" ]]; then
  build_target "${PKG_NODE_TARGET}-win-x64" "windows" "x64" ".exe"
  build_target "${PKG_NODE_TARGET}-win-arm64" "windows" "arm64" ".exe"
fi

echo "==> Built release archives in $DIST_DIR"
ls -1 "$DIST_DIR" | sed 's/^/ - /'
