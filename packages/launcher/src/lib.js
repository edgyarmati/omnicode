import { mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  OMNICODE_BINARY_VERSION,
  OPENCODE_VERSION_TARGET,
  getLauncherAssetName,
  getVersionedReleaseAssetUrl,
} from "./release.js";

export const MINIMUM_NODE_MAJOR = 22;
export const OMNICODE_PACKAGE_NAME = "omnicode";
export const OMNICODE_SETUP_TARGET = `${OMNICODE_PACKAGE_NAME}@latest`;

export function parseNodeMajorVersion(version) {
  const match = /^v?(\d+)/u.exec(String(version).trim());
  if (!match) return null;
  const major = Number.parseInt(match[1], 10);
  return Number.isFinite(major) ? major : null;
}

export function parseSemver(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)/u.exec(String(version).trim().replace(/^v/u, ""));
  if (!match) return null;
  return match.slice(1).map((part) => Number.parseInt(part, 10));
}

export function compareSemver(left, right) {
  const a = parseSemver(left);
  const b = parseSemver(right);
  if (!a || !b) return 0;
  for (let i = 0; i < 3; i += 1) {
    if (a[i] > b[i]) return 1;
    if (a[i] < b[i]) return -1;
  }
  return 0;
}

export function isSupportedNodeVersion(version, minimumMajor = MINIMUM_NODE_MAJOR) {
  const major = parseNodeMajorVersion(version);
  return major !== null && major >= minimumMajor;
}

export function getOmniCodeSetupTarget() {
  return process.env.OMNICODE_SETUP_TARGET || OMNICODE_SETUP_TARGET;
}

export function getXdgConfigHome(homeDir = os.homedir()) {
  return path.join(homeDir, ".config", "omnicode");
}

export function getOmniCodeDataRoot(homeDir = os.homedir(), platform = process.platform, env = process.env) {
  if (platform === "darwin") {
    return path.join(homeDir, "Library", "Application Support", "omnicode");
  }
  if (platform === "win32") {
    return path.join(env.LOCALAPPDATA || path.join(homeDir, "AppData", "Local"), "OmniCode");
  }
  return path.join(env.XDG_DATA_HOME || path.join(homeDir, ".local", "share"), "omnicode");
}

export function getManagedOpenCodeRoot(homeDir = os.homedir(), platform = process.platform, env = process.env) {
  return path.join(getOmniCodeDataRoot(homeDir, platform, env), "runtimes", "opencode");
}

export function getManagedOpenCodeVersionDir(
  version = OPENCODE_VERSION_TARGET,
  homeDir = os.homedir(),
  platform = process.platform,
  env = process.env,
) {
  return path.join(getManagedOpenCodeRoot(homeDir, platform, env), version);
}

export function getManagedOpenCodeBinaryPath(
  version = OPENCODE_VERSION_TARGET,
  homeDir = os.homedir(),
  platform = process.platform,
  env = process.env,
) {
  const executable = platform === "win32" ? "opencode.exe" : "opencode";
  return path.join(getManagedOpenCodeVersionDir(version, homeDir, platform, env), "bin", executable);
}

export function getManagedOpenCodeMetadataPath(homeDir = os.homedir(), platform = process.platform, env = process.env) {
  return path.join(getManagedOpenCodeRoot(homeDir, platform, env), "current.json");
}

export function needsManagedOpenCodeUpdate(currentVersion, requiredVersion = OPENCODE_VERSION_TARGET) {
  if (!currentVersion) return true;
  return compareSemver(currentVersion, requiredVersion) < 0;
}

export function getConfigRoot(homeDir = os.homedir()) {
  return path.join(getXdgConfigHome(homeDir), "opencode");
}

export function buildLauncherEnv(baseEnv, configPath, configRoot, homeDir = os.homedir()) {
  return {
    ...baseEnv,
    XDG_CONFIG_HOME: getXdgConfigHome(homeDir),
    OPENCODE_CONFIG: configPath,
    OPENCODE_CONFIG_DIR: configRoot,
    OPENCODE_CLIENT: "omnicode",
  };
}

export function getNativeLauncherReleaseMetadata(platform = process.platform, arch = process.arch) {
  return {
    launcherVersion: OMNICODE_BINARY_VERSION,
    opencodeVersion: OPENCODE_VERSION_TARGET,
    assetName: getLauncherAssetName(platform, arch),
    assetUrl: getVersionedReleaseAssetUrl(platform, arch, OMNICODE_BINARY_VERSION),
  };
}

export async function ensureOmniCodeConfig({
  homeDir = os.homedir(),
  pluginEntry,
}) {
  const configRoot = getConfigRoot(homeDir);
  const pluginDir = path.join(configRoot, "plugins");
  await mkdir(pluginDir, { recursive: true });

  const pluginShimPath = path.join(pluginDir, "omnicode-plugin.js");
  const configPath = path.join(configRoot, "opencode.json");

  const shimSource = `export { OmniCodePlugin, default } from ${JSON.stringify(pluginEntry)};\n`;
  await writeFile(pluginShimPath, shimSource, "utf8");

  const config = {
    $schema: "https://opencode.ai/config.json",
    default_agent: "omnicode",
    share: "manual",
  };
  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");

  return { configRoot, configPath, pluginShimPath };
}
