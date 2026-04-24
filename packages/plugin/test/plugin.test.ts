import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { mkdtemp, readFile, rm, writeFile, mkdir } from "node:fs/promises";

import {
  OMNI_FILES,
  discoverStandards,
  ensureOmniDir,
  importStandards,
  planningArtifactsReady,
} from "../src/index.ts";

async function withTempDir(run: (dir: string) => Promise<void>) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "omnicode-plugin-test-"));
  try {
    await run(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test("discoverStandards finds supported standards files and ignores .omni", async () => {
  await withTempDir(async (dir) => {
    await mkdir(path.join(dir, ".github", "instructions"), { recursive: true });
    await mkdir(path.join(dir, ".cursor", "rules"), { recursive: true });
    await mkdir(path.join(dir, ".omni"), { recursive: true });
    await writeFile(path.join(dir, "AGENTS.md"), "# agents\n", "utf8");
    await writeFile(path.join(dir, ".github", "copilot-instructions.md"), "# copilot\n", "utf8");
    await writeFile(path.join(dir, ".github", "instructions", "repo.instructions.md"), "# gh\n", "utf8");
    await writeFile(path.join(dir, ".cursor", "rules", "ui.mdc"), "# cursor\n", "utf8");
    await writeFile(path.join(dir, ".omni", "AGENTS.md"), "# ignored\n", "utf8");

    const found = await discoverStandards(dir);
    assert.deepEqual(
      found.map((item) => item.path),
      [
        ".cursor/rules/ui.mdc",
        ".github/copilot-instructions.md",
        ".github/instructions/repo.instructions.md",
        "AGENTS.md",
      ],
    );
  });
});

test("importStandards writes imported content into .omni/STANDARDS.md", async () => {
  await withTempDir(async (dir) => {
    await writeFile(path.join(dir, "AGENTS.md"), "# Project Agent\n\nHello\n", "utf8");
    const result = await importStandards(dir);

    assert.equal(result.imported.length, 1);
    const standards = await readFile(path.join(dir, ".omni", "STANDARDS.md"), "utf8");
    assert.match(standards, /## AGENTS: AGENTS\.md/);
    assert.match(standards, /# Project Agent/);
  });
});

test("planningArtifactsReady rejects placeholders and accepts real planning content", async () => {
  await withTempDir(async (dir) => {
    await ensureOmniDir(dir);

    assert.equal(await planningArtifactsReady(dir), false);

    await writeFile(
      path.join(dir, ".omni", "SPEC.md"),
      `${OMNI_FILES["SPEC.md"]}\n## Goal\nReal content\n`,
      "utf8",
    );
    await writeFile(
      path.join(dir, ".omni", "TASKS.md"),
      `${OMNI_FILES["TASKS.md"]}\n## Slice 1\n- [ ] Do work\n`,
      "utf8",
    );

    assert.equal(await planningArtifactsReady(dir), true);
  });
});
