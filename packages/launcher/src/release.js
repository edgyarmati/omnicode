export const OMNICODE_REPOSITORY = "edgyarmati/omnicode";
export const OMNICODE_RELEASE_CHANNEL = "latest";
export const OMNICODE_BINARY_VERSION = "0.1.0";
export const OPENCODE_VERSION_TARGET = "1.14.22";

const PLATFORM_LABELS = {
  darwin: "darwin",
  linux: "linux",
  win32: "windows",
};

const ARCH_LABELS = {
  arm64: "arm64",
  x64: "x64",
};

export function normalizePlatform(platform) {
  return PLATFORM_LABELS[platform] ?? platform;
}

export function normalizeArch(arch) {
  return ARCH_LABELS[arch] ?? arch;
}

export function getLauncherAssetExtension(platform) {
  return platform === "win32" ? "zip" : "tar.gz";
}

export function getLauncherAssetName(platform, arch, version = OMNICODE_BINARY_VERSION) {
  const normalizedPlatform = normalizePlatform(platform);
  const normalizedArch = normalizeArch(arch);
  const ext = getLauncherAssetExtension(platform);
  return `omnicode-${version}-${normalizedPlatform}-${normalizedArch}.${ext}`;
}

export function getLatestReleaseAssetUrl(platform, arch) {
  return `https://github.com/${OMNICODE_REPOSITORY}/releases/latest/download/${getLauncherAssetName(platform, arch)}`;
}

export function getVersionedReleaseAssetUrl(platform, arch, version) {
  return `https://github.com/${OMNICODE_REPOSITORY}/releases/download/v${version}/${getLauncherAssetName(platform, arch, version)}`;
}

export function getRequiredOpenCodeVersion() {
  return OPENCODE_VERSION_TARGET;
}
