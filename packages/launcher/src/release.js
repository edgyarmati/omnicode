export const OMNICODE_REPOSITORY = "edgyarmati/omnicode";
export const OMNICODE_RELEASE_CHANNEL = "latest";
export const OMNICODE_BINARY_VERSION = "0.3.0";
export const OPENCODE_VERSION_TARGET = "1.14.30";

export function normalizePlatform(platform) {
  return platform;
}

export function normalizeArch(arch) {
  return arch;
}

export function getLauncherAssetExtension(platform) {
  return "tar.gz";
}

export function getLauncherAssetName(platform, arch, version = OMNICODE_BINARY_VERSION) {
  return `omnicode-${version}.${getLauncherAssetExtension(platform)}`;
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
