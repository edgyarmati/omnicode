import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { access, mkdtemp, readFile, rm } from "node:fs/promises";

import {
  MINIMUM_NODE_MAJOR,
  buildLauncherEnv,
  ensureOmniCodeConfig,
  getConfigRoot,
  getXdgConfigHome,
  isSupportedNodeVersion,
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
    assert.match(shim, /file:\/\/\/tmp\/fake-plugin\.js/);
  });
});

test("node version helpers enforce the minimum supported release", () => {
  assert.equal(parseNodeMajorVersion("v22.3.0"), 22);
  assert.equal(parseNodeMajorVersion("24.1.0"), 24);
  assert.equal(parseNodeMajorVersion("not-a-version"), null);
  assert.equal(isSupportedNodeVersion(`v${MINIMUM_NODE_MAJOR}.0.0`), true);
  assert.equal(isSupportedNodeVersion(`v${MINIMUM_NODE_MAJOR - 1}.9.9`), false);
});

test("release setup assets and launcher package metadata are present", async () => {
  const repoRoot = path.resolve(import.meta.dirname, "..", "..", "..");
  const launcherPackage = JSON.parse(
    await readFile(path.join(repoRoot, "packages", "launcher", "package.json"), "utf8"),
  );

  assert.equal(launcherPackage.name, "omnicode");
  assert.equal(launcherPackage.bin.omnicode, "./bin/omnicode.js");
  assert.deepEqual(launcherPackage.files, ["bin", "src"]);

  await access(path.join(repoRoot, "scripts", "setup"));
  await access(path.join(repoRoot, "scripts", "install.sh"));
});
