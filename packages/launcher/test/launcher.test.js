import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { mkdtemp, readFile, rm } from "node:fs/promises";

import {
  buildLauncherEnv,
  ensureOmniCodeConfig,
  getConfigRoot,
  getXdgConfigHome,
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
