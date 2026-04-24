#!/usr/bin/env node

import os from "node:os";
import process from "node:process";
import { spawn } from "node:child_process";

import {
  MINIMUM_NODE_MAJOR,
  buildLauncherEnv,
  ensureOmniCodeConfig,
  getOmniCodeSetupTarget,
  isSupportedNodeVersion,
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

function runCommand(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { stdio: "inherit", shell: false });
    child.on("exit", (code) => resolve(code === 0));
    child.on("error", () => resolve(false));
  });
}

function captureCommand(command, args) {
  return new Promise((resolve) => {
    let stdout = "";
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "ignore"], shell: false });
    child.stdout?.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.on("exit", (code) => resolve(code === 0 ? stdout.trim() : null));
    child.on("error", () => resolve(null));
  });
}

async function runSetup() {
  const version = process.version;
  if (!isSupportedNodeVersion(version)) {
    process.stderr.write(
      `Node.js ${MINIMUM_NODE_MAJOR}+ is required, but found ${version}. Please upgrade Node and rerun setup.\n`,
    );
    process.exit(1);
  }

  const npmCommand = isWindows() ? "npm.cmd" : "npm";
  if (!(await existsOnPath(npmCommand))) {
    process.stderr.write("npm is required for OmniCode setup. Install npm and rerun `npx omnicode@latest setup`.\n");
    process.exit(1);
  }

  const target = getOmniCodeSetupTarget();
  process.stderr.write(`Installing ${target} globally so the omnicode command is available...\n`);
  const installed = await runCommand(npmCommand, ["install", "-g", target]);
  if (!installed) {
    process.stderr.write(
      `Failed to install ${target} globally. Try 'npm install -g ${target}' manually and rerun OmniCode.\n`,
    );
    process.exit(1);
  }

  const omnicodePresent = await existsOnPath(isWindows() ? "omnicode.cmd" : "omnicode");
  if (!omnicodePresent) {
    const prefix = await captureCommand(npmCommand, ["prefix", "-g"]);
    const binHint = prefix
      ? isWindows()
        ? `${prefix}`
        : `${prefix}/bin`
      : "npm's global bin directory";
    process.stderr.write(
      `OmniCode was installed, but the 'omnicode' command is not on PATH yet. Restart your shell or add ${binHint} to PATH.\n`,
    );
    process.exit(1);
  }

  process.stderr.write("OmniCode setup complete. Next step: run `omnicode`.\n");
  return;
}

async function main() {
  if (process.argv[2] === "setup") {
    await runSetup();
    return;
  }

  const explicitBin = process.env.OMNICODE_OPENCODE_BIN;
  const opencodeBin = explicitBin || opencodeCommandName();

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
