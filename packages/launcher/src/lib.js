import { mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export const MINIMUM_NODE_MAJOR = 22;
export const OMNICODE_PACKAGE_NAME = "omnicode";
export const OMNICODE_SETUP_TARGET = `${OMNICODE_PACKAGE_NAME}@latest`;

export function parseNodeMajorVersion(version) {
  const match = /^v?(\d+)/u.exec(String(version).trim());
  if (!match) return null;
  const major = Number.parseInt(match[1], 10);
  return Number.isFinite(major) ? major : null;
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
