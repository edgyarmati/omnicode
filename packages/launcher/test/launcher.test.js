import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { access, mkdtemp, readFile, rm } from "node:fs/promises";

import {
  MINIMUM_NODE_MAJOR,
  OMNICODE_SETUP_TARGET,
  buildLauncherEnv,
  compareSemver,
  ensureOmniCodeConfig,
  getConfigRoot,
  getManagedOpenCodeBinaryPath,
  getManagedOpenCodeInstallArgs,
  getManagedOpenCodeMetadataPath,
  getManagedOpenCodeRoot,
  getNativeLauncherReleaseMetadata,
  getOmniCodeDataRoot,
  getOmniCodeSetupTarget,
  getXdgConfigHome,
  isSupportedNodeVersion,
  needsManagedOpenCodeUpdate,
  parseNodeMajorVersion,
} from "../src/lib.js";

async function withTempHome(run) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "omnicode-launcher-test-"));
  try {
    await run(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test("config paths are scoped under ~/.config/omnicode", () => {
  const home = "/tmp/example-home";
  assert.equal(getXdgConfigHome(home), "/tmp/example-home/.config/omnicode");
  assert.equal(getConfigRoot(home), "/tmp/example-home/.config/omnicode/opencode");
});

test("buildLauncherEnv sets isolated OmniCode env vars", () => {
  const env = buildLauncherEnv(
    { PATH: "/bin" },
    "/tmp/home/.config/omnicode/opencode/opencode.json",
    "/tmp/home/.config/omnicode/opencode",
    "/tmp/home",
  );

  assert.equal(env.PATH, "/bin");
  assert.equal(env.XDG_CONFIG_HOME, "/tmp/home/.config/omnicode");
  assert.equal(env.OPENCODE_CONFIG, "/tmp/home/.config/omnicode/opencode/opencode.json");
  assert.equal(env.OPENCODE_CONFIG_DIR, "/tmp/home/.config/omnicode/opencode");
  assert.equal(env.OPENCODE_CLIENT, "omnicode");
});

test("ensureOmniCodeConfig writes config and plugin shim", async () => {
  await withTempHome(async (home) => {
    const result = await ensureOmniCodeConfig({
      homeDir: home,
      pluginEntry: "file:///tmp/fake-plugin.js",
    });

    const config = JSON.parse(await readFile(result.configPath, "utf8"));
    const shim = await readFile(result.pluginShimPath, "utf8");

    assert.equal(result.configRoot, path.join(home, ".config", "omnicode", "opencode"));
    assert.equal(config.default_agent, "omnicode");
    assert.equal(config.share, "manual");
    assert.match(shim, /fake-plugin\.js/);
  });
});

test("node version helpers enforce the minimum supported release", () => {
  assert.equal(parseNodeMajorVersion("v22.3.0"), 22);
  assert.equal(parseNodeMajorVersion("24.1.0"), 24);
  assert.equal(parseNodeMajorVersion("not-a-version"), null);
  assert.equal(isSupportedNodeVersion(`v${MINIMUM_NODE_MAJOR}.0.0`), true);
  assert.equal(isSupportedNodeVersion(`v${MINIMUM_NODE_MAJOR - 1}.9.9`), false);
  assert.equal(getOmniCodeSetupTarget(), OMNICODE_SETUP_TARGET);
});

test("managed OpenCode runtime helpers resolve user-scoped paths and version checks", () => {
  const linuxHome = "/tmp/example-home";
  const linuxEnv = { XDG_DATA_HOME: "/tmp/example-data" };
  assert.equal(getOmniCodeDataRoot(linuxHome, "linux", linuxEnv), "/tmp/example-data/omnicode");
  assert.equal(getManagedOpenCodeRoot(linuxHome, "linux", linuxEnv), "/tmp/example-data/omnicode/runtimes/opencode");
  assert.equal(
    getManagedOpenCodeBinaryPath("1.2.3", linuxHome, "linux", linuxEnv),
    "/tmp/example-data/omnicode/runtimes/opencode/1.2.3/bin/opencode",
  );
  assert.equal(
    getManagedOpenCodeMetadataPath(linuxHome, "linux", linuxEnv),
    "/tmp/example-data/omnicode/runtimes/opencode/current.json",
  );

  const windowsHome = "C:\\Users\\me";
  const windowsEnv = { LOCALAPPDATA: "C:\\Users\\me\\AppData\\Local" };
  assert.match(getOmniCodeDataRoot(windowsHome, "win32", windowsEnv), /OmniCode$/);
  assert.match(getManagedOpenCodeBinaryPath("1.2.3", windowsHome, "win32", windowsEnv), /opencode\.cmd$/);

  assert.deepEqual(
    getManagedOpenCodeInstallArgs("1.2.3", linuxHome, "linux", linuxEnv),
    [
      "install",
      "-g",
      "opencode-ai@1.2.3",
      "--prefix",
      "/tmp/example-data/omnicode/runtimes/opencode/1.2.3",
    ],
  );

  assert.equal(compareSemver("1.2.3", "1.2.3"), 0);
  assert.equal(compareSemver("1.2.4", "1.2.3"), 1);
  assert.equal(compareSemver("1.2.3", "1.3.0"), -1);
  assert.equal(needsManagedOpenCodeUpdate(null, "1.0.0"), true);
  assert.equal(needsManagedOpenCodeUpdate("1.0.0", "1.0.1"), true);
  assert.equal(needsManagedOpenCodeUpdate("1.0.1", "1.0.1"), false);
});

test("native launcher release metadata includes asset naming for current platform", () => {
  const metadata = getNativeLauncherReleaseMetadata("darwin", "arm64");
  assert.equal(metadata.launcherVersion, "0.1.0");
  assert.match(metadata.opencodeVersion, /^\d+\.\d+\.\d+$/);
  assert.match(metadata.assetName, /omnicode-0\.1\.0-darwin-arm64\.tar\.gz$/);
  assert.match(metadata.assetUrl, /releases\/download\/v0\.1\.0\/omnicode-0\.1\.0-darwin-arm64\.tar\.gz$/);
});

test("native installer assets and launcher package metadata are present", async () => {
  const repoRoot = path.resolve(import.meta.dirname, "..", "..", "..");
  const launcherPackage = JSON.parse(
    await readFile(path.join(repoRoot, "packages", "launcher", "package.json"), "utf8"),
  );
  const posixInstaller = await readFile(path.join(repoRoot, "install.sh"), "utf8");
  const windowsInstaller = await readFile(path.join(repoRoot, "install.ps1"), "utf8");
  const releaseWorkflow = await readFile(path.join(repoRoot, ".github", "workflows", "release.yml"), "utf8");
  const bundleScript = await readFile(path.join(repoRoot, "scripts", "release", "bundle.sh"), "utf8");
  const launcherBin = await readFile(path.join(repoRoot, "packages", "launcher", "bin", "omnicode.js"), "utf8");

  assert.equal(launcherPackage.name, "omnicode");
  assert.equal(launcherPackage.bin.omnicode, "./bin/omnicode.js");
  assert.deepEqual(launcherPackage.files, ["bin", "src"]);
  assert.match(posixInstaller, /releases\/download/);
  assert.match(windowsInstaller, /releases\/download/);
  assert.match(launcherBin, /getManagedOpenCodeBinaryCandidates/);
  assert.match(launcherBin, /getNativeLauncherReleaseMetadata/);
  assert.match(releaseWorkflow, /name: Release/);
  assert.match(releaseWorkflow, /softprops\/action-gh-release/);
  assert.match(bundleScript, /omnicode-.*\.tar\.gz/);
  assert.match(bundleScript, /plugin/);

  await access(path.join(repoRoot, "scripts", "setup"));
  await access(path.join(repoRoot, "scripts", "release", "bundle.sh"));
  await access(path.join(repoRoot, "install.sh"));
  await access(path.join(repoRoot, "install.ps1"));
  await access(path.join(repoRoot, "docs", "release-checklist.md"));
});
