#!/usr/bin/env node

import os from "node:os";
import path from "node:path";
import process from "node:process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  MINIMUM_NODE_MAJOR,
  buildLauncherEnv,
  ensureOmniCodeConfig,
  getManagedOpenCodeBinaryCandidates,
  getManagedOpenCodeInstallArgs,
  getManagedOpenCodeMetadataPath,
  getManagedOpenCodeVersionDir,
  getNativeLauncherReleaseMetadata,
  getOmniCodeSetupTarget,
  isSupportedNodeVersion,
  needsManagedOpenCodeUpdate,
} from "../src/lib.js";

function isWindows() {
  return process.platform === "win32";
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

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
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

async function resolveManagedOpenCodeBinary(version, homeDir) {
  const candidates = getManagedOpenCodeBinaryCandidates(version, homeDir);
  for (const candidate of candidates) {
    // eslint-disable-next-line no-await-in-loop
    if (await fileExists(candidate)) return candidate;
  }
  return null;
}

async function readManagedOpenCodeVersion(homeDir) {
  const metadataPath = getManagedOpenCodeMetadataPath(homeDir);
  try {
    const parsed = JSON.parse(await readFile(metadataPath, "utf8"));
    if (typeof parsed.version === "string" && parsed.version.length > 0) {
      return parsed.version;
    }
    return null;
  } catch {
    return null;
  }
}

async function writeManagedOpenCodeMetadata(homeDir, data) {
  const metadataPath = getManagedOpenCodeMetadataPath(homeDir);
  await mkdir(getManagedOpenCodeVersionDir(data.version, homeDir), { recursive: true });
  await writeFile(
    metadataPath,
    `${JSON.stringify({
      version: data.version,
      binaryPath: data.binaryPath,
      installedAt: new Date().toISOString(),
    }, null, 2)}\n`,
    "utf8",
  );
}

async function installManagedOpenCodeRuntime(version, homeDir) {
  const npmCommand = isWindows() ? "npm.cmd" : "npm";
  if (!(await existsOnPath(npmCommand))) {
    process.stderr.write(
      "npm is required to install the managed OpenCode runtime. Install npm and rerun OmniCode.\n",
    );
    process.exit(1);
  }

  const args = getManagedOpenCodeInstallArgs(version, homeDir);
  process.stderr.write(`Installing managed OpenCode ${version}...\n`);
  const installed = await runCommand(npmCommand, args);
  if (!installed) {
    process.stderr.write(
      [
        `Failed to install managed OpenCode ${version}.`,
        `Manual fallback: npm ${args.join(" ")}`,
      ].join("\n") + "\n",
    );
    process.exit(1);
  }

  const binary = await resolveManagedOpenCodeBinary(version, homeDir);
  if (!binary) {
    process.stderr.write(
      `Managed OpenCode ${version} installed, but no executable was found under ${getManagedOpenCodeVersionDir(version, homeDir)}.\n`,
    );
    process.exit(1);
  }

  await writeManagedOpenCodeMetadata(homeDir, {
    version,
    binaryPath: binary,
  });

  return binary;
}

async function ensureManagedOpenCodeRuntime(version, homeDir) {
  const installedVersion = await readManagedOpenCodeVersion(homeDir);
  const installedBinary = installedVersion
    ? await resolveManagedOpenCodeBinary(installedVersion, homeDir)
    : null;

  if (!needsManagedOpenCodeUpdate(installedVersion, version) && installedBinary) {
    return installedBinary;
  }

  const targetBinary = await resolveManagedOpenCodeBinary(version, homeDir);
  if (targetBinary) {
    await writeManagedOpenCodeMetadata(homeDir, {
      version,
      binaryPath: targetBinary,
    });
    return targetBinary;
  }

  return installManagedOpenCodeRuntime(version, homeDir);
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
}

async function resolvePluginPath() {
  // Try bundled plugin first (installed via install.sh / install.ps1)
  const binDir = path.dirname(fileURLToPath(import.meta.url));
  const bundledPlugin = path.join(binDir, "..", "plugin", "index.js");
  if (await fileExists(bundledPlugin)) {
    return bundledPlugin;
  }

  // Fall back to npm resolution (dev / npm install -g mode)
  try {
    return import.meta.resolve("@omnicode/plugin");
  } catch {
    process.stderr.write(
      "Cannot find the OmniCode plugin. Reinstall OmniCode or run 'omnicode setup'.\n",
    );
    process.exit(1);
  }
}

async function main() {
  if (process.argv[2] === "setup") {
    await runSetup();
    return;
  }

  const homeDir = os.homedir();
  const explicitBin = process.env.OMNICODE_OPENCODE_BIN;
  const release = getNativeLauncherReleaseMetadata();

  const opencodeBin = explicitBin || (await ensureManagedOpenCodeRuntime(release.opencodeVersion, homeDir));

  const pluginPath = await resolvePluginPath();
  const { configRoot, configPath } = await ensureOmniCodeConfig({
    homeDir,
    pluginEntry: pluginPath,
  });
  const env = buildLauncherEnv(process.env, configPath, configRoot, homeDir);

  // Handle --dangerously-skip-permissions: set OPENCODE_PERMISSION env var
  // so it works across all OpenCode versions (the CLI flag was added later)
  const skipPermIdx = process.argv.indexOf("--dangerously-skip-permissions");
  if (skipPermIdx !== -1) {
    env.OPENCODE_PERMISSION = JSON.stringify({ "*": "allow" });
    process.argv.splice(skipPermIdx, 1);
  }

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
