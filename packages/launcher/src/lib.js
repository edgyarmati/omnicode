import { mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

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
