#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

function isWindows() {
  return process.platform === "win32";
}

function opencodeCommandName() {
  return isWindows() ? "opencode.cmd" : "opencode";
}

async function existsOnPath(command) {
  return new Promise((resolve) => {
    const probe = spawn(isWindows() ? "where" : "which", [command], {
      stdio: "ignore",
      shell: false,
    });
    probe.on("exit", (code) => resolve(code === 0));
    probe.on("error", () => resolve(false));
  });
}

async function runInstallAttempt() {
  const attempts = [
    { cmd: "npm", args: ["install", "-g", "opencode-ai"] },
    { cmd: "bun", args: ["install", "-g", "opencode-ai"] },
    { cmd: "pnpm", args: ["add", "-g", "opencode-ai"] },
  ];

  for (const attempt of attempts) {
    // eslint-disable-next-line no-await-in-loop
    const available = await existsOnPath(isWindows() && attempt.cmd === "npm" ? "npm.cmd" : attempt.cmd);
    if (!available) continue;

    const command = isWindows() ? `${attempt.cmd}.cmd` : attempt.cmd;
    const installed = await new Promise((resolve) => {
      const child = spawn(command, attempt.args, { stdio: "inherit", shell: false });
      child.on("exit", (code) => resolve(code === 0));
      child.on("error", () => resolve(false));
    });

    if (installed) return true;
  }

  return false;
}

function getXdgConfigHome() {
  return path.join(os.homedir(), ".config", "omnicode");
}

function getConfigRoot() {
  return path.join(getXdgConfigHome(), "opencode");
}

async function ensureOmniCodeConfig() {
  const configRoot = getConfigRoot();
  const pluginDir = path.join(configRoot, "plugins");
  await mkdir(pluginDir, { recursive: true });

  const pluginEntry = import.meta.resolve("@omnicode/plugin");
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

  return { configRoot, configPath };
}

async function main() {
  const explicitBin = process.env.OMNICODE_OPENCODE_BIN;
  let opencodeBin = explicitBin || opencodeCommandName();

  const present = explicitBin ? true : await existsOnPath(opencodeBin);
  if (!present) {
    process.stderr.write("OpenCode was not found on PATH. Trying a best-effort install...\n");
    const installed = await runInstallAttempt();
    if (!installed) {
      process.stderr.write(
        [
          "Failed to install OpenCode automatically.",
          "Install it manually, then run OmniCode again.",
          "Suggested command: npm install -g opencode-ai",
        ].join("\n") + "\n",
      );
      process.exit(1);
    }
  }

  const { configRoot, configPath } = await ensureOmniCodeConfig();
  const env = {
    ...process.env,
    XDG_CONFIG_HOME: getXdgConfigHome(),
    OPENCODE_CONFIG: configPath,
    OPENCODE_CONFIG_DIR: configRoot,
    OPENCODE_CLIENT: "omnicode",
  };

  const child = spawn(opencodeBin, process.argv.slice(2), {
    stdio: "inherit",
    env,
    shell: false,
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code ?? 0);
  });

  child.on("error", (error) => {
    process.stderr.write(`Failed to launch OpenCode: ${error.message}\n`);
    process.exit(1);
  });
}

await main();
