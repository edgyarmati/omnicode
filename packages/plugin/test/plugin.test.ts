import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { chmod, mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";

import {
  OMNI_FILES,
  OMNI_GITIGNORE,
  appendSessionSummary,
  buildRepoMap,
  discoverStandards,
  ensureOmniDir,
  importStandards,
  planningArtifactsReady,
  setOmniMode,
  suggestSkills,
  updateSkillsFile,
  updateStateFile,
  writeFileAtomic,
} from "../src/index.ts";

async function withTempDir(run: (dir: string) => Promise<void>) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "omnicode-plugin-test-"));
  try {
    await run(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

function modeBits(mode: number): number {
  return mode & 0o777;
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

test("ensureOmniDir writes a selective .omni/.gitignore for runtime state", async () => {
  await withTempDir(async (dir) => {
    await ensureOmniDir(dir);
    const gitignore = await readFile(path.join(dir, ".omni", ".gitignore"), "utf8");

    assert.equal(gitignore, `${OMNI_GITIGNORE}\n`);
    assert.match(gitignore, /STATE\.md/);
    assert.doesNotMatch(gitignore, /PROJECT\.md/);
  });
});

test("writeFileAtomic preserves existing file permissions", async () => {
  await withTempDir(async (dir) => {
    const filePath = path.join(dir, ".omni", "STATE.md");
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, "old\n", "utf8");
    await chmod(filePath, 0o600);

    await writeFileAtomic(filePath, "new\n");

    assert.equal(await readFile(filePath, "utf8"), "new\n");
    assert.equal(modeBits((await stat(filePath)).mode), 0o600);
  });
});

test("updateStateFile preserves permissions through atomic replacement", async () => {
  await withTempDir(async (dir) => {
    await ensureOmniDir(dir);
    const statePath = path.join(dir, ".omni", "STATE.md");
    await chmod(statePath, 0o600);

    await updateStateFile(dir, {
      currentPhase: "execution",
      activeTask: "Atomic write slice",
    });

    assert.equal(modeBits((await stat(statePath)).mode), 0o600);
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

test("importStandards preserves embedded fences without closing the wrapper fence", async () => {
  await withTempDir(async (dir) => {
    await writeFile(
      path.join(dir, "AGENTS.md"),
      "# Project Agent\n\n```ts\nconst value = true;\n```\n\n## Keep as imported content\n",
      "utf8",
    );

    await importStandards(dir);

    const standards = await readFile(path.join(dir, ".omni", "STANDARDS.md"), "utf8");
    assert.match(standards, /````md\n# Project Agent/);
    assert.match(standards, /```ts\nconst value = true;\n```/);
    assert.match(standards, /\n````\n$/);
  });
});

test("planningArtifactsReady rejects placeholders and requires SPEC, TASKS, and TESTS content", async () => {
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

    assert.equal(await planningArtifactsReady(dir), false);

    await writeFile(
      path.join(dir, ".omni", "TESTS.md"),
      `${OMNI_FILES["TESTS.md"]}\n## Checks\n- [ ] Run the smoke test\n`,
      "utf8",
    );

    assert.equal(await planningArtifactsReady(dir), true);
  });
});

test("buildRepoMap ranks important files and writes both markdown and json outputs", async () => {
  await withTempDir(async (dir) => {
    await mkdir(path.join(dir, "src"), { recursive: true });
    await writeFile(path.join(dir, "README.md"), "# Test Repo\n", "utf8");
    await writeFile(
      path.join(dir, "package.json"),
      JSON.stringify({ name: "repo", description: "sample" }, null, 2),
      "utf8",
    );
    await writeFile(path.join(dir, "src", "index.ts"), "export function main() {}\n", "utf8");

    const markdown = await buildRepoMap(dir);
    const json = JSON.parse(await readFile(path.join(dir, ".omni", "REPO-MAP.json"), "utf8"));

    assert.match(markdown, /## Ranked files/);
    assert.equal(json[0].path, "package.json");
    assert.ok(json.some((entry: { path: string }) => entry.path === "src/index.ts"));
  });
});

test("buildRepoMap sanitizes package metadata in markdown summaries", async () => {
  await withTempDir(async (dir) => {
    await writeFile(
      path.join(dir, "package.json"),
      JSON.stringify({ name: "repo", description: "safe\n## injected heading" }, null, 2),
      "utf8",
    );

    const markdown = await buildRepoMap(dir);

    assert.doesNotMatch(markdown, /^## injected heading$/m);
    assert.match(markdown, /safe injected heading/);
  });
});

test("buildRepoMap skips large files instead of reading full contents", async () => {
  await withTempDir(async (dir) => {
    await mkdir(path.join(dir, "src"), { recursive: true });
    await writeFile(path.join(dir, "src", "large.json"), `${"x".repeat(140 * 1024)}\n`, "utf8");

    const markdown = await buildRepoMap(dir);
    const json = JSON.parse(await readFile(path.join(dir, ".omni", "REPO-MAP.json"), "utf8"));
    const largeEntry = json.find((entry: { path: string }) => entry.path === "src/large.json");

    assert.match(markdown, /src\/large\.json/);
    assert.match(largeEntry.summary, /large file skipped/);
  });
});

test("suggestSkills and updateSkillsFile infer workflow skills from task text", async () => {
  await withTempDir(async (dir) => {
    const task = "Design a feature, plan the slices, implement it, and verify the result";
    const suggestions = await suggestSkills(task);

    assert.deepEqual(
      [...suggestions.map((item) => item.name)].sort(),
      ["brainstorming", "grill-me", "omni-execution", "omni-planning", "omni-verification"],
    );

    const result = await updateSkillsFile(dir, task);
    const skillsFile = await readFile(path.join(dir, ".omni", "SKILLS.md"), "utf8");

    assert.equal(result.suggested.length, 5);
    assert.match(skillsFile, /## Suggested For Current Work/);
    assert.match(skillsFile, /grill-me/);
    assert.match(skillsFile, /brainstorming/);
    assert.match(skillsFile, /omni-verification/);
  });
});

test("suggestSkills prioritizes grill-me for change requests", async () => {
  const suggestions = await suggestSkills("Add a new onboarding feature and refactor the setup flow");

  assert.equal(suggestions[0]?.name, "grill-me");
  assert.ok(suggestions.some((item) => item.name === "brainstorming"));
});

test("updateSkillsFile preserves user-managed project notes", async () => {
  await withTempDir(async (dir) => {
    await ensureOmniDir(dir);
    await writeFile(
      path.join(dir, ".omni", "SKILLS.md"),
      [
        "# Skills",
        "",
        "## Suggested For Current Work",
        "",
        "- stale generated item",
        "",
        "## Project Notes",
        "",
        "- Always load the repo-specific release skill before publishing.",
        "",
      ].join("\n"),
      "utf8",
    );

    await updateSkillsFile(dir, "verify the implementation");

    const skillsFile = await readFile(path.join(dir, ".omni", "SKILLS.md"), "utf8");
    assert.match(skillsFile, /omni-verification/);
    assert.match(skillsFile, /Always load the repo-specific release skill/);
    assert.doesNotMatch(skillsFile, /stale generated item/);
  });
});

test("updateStateFile writes structured current workflow state", async () => {
  await withTempDir(async (dir) => {
    const outputPath = await updateStateFile(dir, {
      currentPhase: "execution",
      activeTask: "Slice 2",
      statusSummary: "Implemented the current slice.",
      blockers: ["None"],
      nextStep: "Run verification.",
    });

    const content = await readFile(outputPath, "utf8");
    assert.match(content, /Current Phase: execution/);
    assert.match(content, /Active Task: Slice 2/);
    assert.match(content, /Status Summary: Implemented the current slice\./);
    assert.match(content, /Next Step: Run verification\./);
  });
});

test("updateStateFile sanitizes markdown structure from tool-provided fields", async () => {
  await withTempDir(async (dir) => {
    const outputPath = await updateStateFile(dir, {
      currentPhase: "execution\n## injected",
      activeTask: "- fake list item",
      statusSummary: "Implemented\n# forged heading",
      blockers: ["---", "## blocker heading"],
      nextStep: "Verify\n- forged bullet",
    });

    const content = await readFile(outputPath, "utf8");
    assert.doesNotMatch(content, /^## injected$/m);
    assert.doesNotMatch(content, /^# forged heading$/m);
    assert.doesNotMatch(content, /^- forged bullet$/m);
    assert.match(content, /Current Phase: execution injected/);
    assert.match(content, /Active Task: fake list item/);
  });
});

test("ensureOmniDir preserves templates and setOmniMode updates state coherently", async () => {
  await withTempDir(async (dir) => {
    await writeFile(
      path.join(dir, "package.json"),
      JSON.stringify({ name: "omnicode-test", description: "sample project" }, null, 2),
      "utf8",
    );

    await ensureOmniDir(dir);
    await setOmniMode(dir, "on");
    let state = await readFile(path.join(dir, ".omni", "STATE.md"), "utf8");
    let config = await readFile(path.join(dir, ".omni", "CONFIG.md"), "utf8");

    assert.match(config, /Omni Mode: on/);
    assert.match(state, /Current Phase: discovery/);
    assert.match(state, /Workspace ready for planning/);

    await setOmniMode(dir, "off");
    state = await readFile(path.join(dir, ".omni", "STATE.md"), "utf8");
    config = await readFile(path.join(dir, ".omni", "CONFIG.md"), "utf8");

    assert.match(config, /Omni Mode: off/);
    assert.match(state, /Current Phase: passive/);
    assert.match(state, /Omni mode disabled/);
  });
});

test("appendSessionSummary appends a titled handoff section", async () => {
  await withTempDir(async (dir) => {
    const outputPath = await appendSessionSummary(dir, {
      title: "Slice 2 Complete",
      bullets: ["Implemented the change", "Verification still pending"],
    });

    const content = await readFile(outputPath, "utf8");
    assert.match(content, /## Slice 2 Complete/);
    assert.match(content, /- Implemented the change/);
    assert.match(content, /- Verification still pending/);
  });
});

test("appendSessionSummary sanitizes headings and bullets", async () => {
  await withTempDir(async (dir) => {
    const outputPath = await appendSessionSummary(dir, {
      title: "Safe title\n## forged title",
      bullets: ["- completed\n## forged heading", "``` fenced marker"],
    });

    const content = await readFile(outputPath, "utf8");
    assert.doesNotMatch(content, /^## forged title$/m);
    assert.doesNotMatch(content, /^## forged heading$/m);
    assert.doesNotMatch(content, /^```/m);
    assert.match(content, /## Safe title forged title/);
    assert.match(content, /- completed forged heading/);
  });
});

test("bash commands are prefixed with rtk (skipping already-prefixed commands)", () => {
  // Simulates the rewriting logic from tool.execute.before
  function rewrite(command: string): string {
    if (!command.trimStart().startsWith("rtk ")) {
      return `rtk ${command}`;
    }
    return command;
  }

  // Should be rewritten
  assert.equal(rewrite("git status"), "rtk git status");
  assert.equal(rewrite("npm test"), "rtk npm test");
  assert.equal(rewrite("cargo test"), "rtk cargo test");
  assert.equal(rewrite("echo hello"), "rtk echo hello");
  assert.equal(rewrite("  git log"), "rtk   git log");

  // Should NOT be double-rewritten
  assert.equal(rewrite("rtk git status"), "rtk git status");
  assert.equal(rewrite("rtk pytest tests/"), "rtk pytest tests/");
});
