#!/usr/bin/env node

import os from "node:os";
import { spawn } from "node:child_process";

import {
  buildLauncherEnv,
  ensureOmniCodeConfig,
} from "../src/lib.js";

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

  const { configRoot, configPath } = await ensureOmniCodeConfig({
    homeDir: os.homedir(),
    pluginEntry: import.meta.resolve("@omnicode/plugin"),
  });
  const env = buildLauncherEnv(process.env, configPath, configRoot, os.homedir());

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
