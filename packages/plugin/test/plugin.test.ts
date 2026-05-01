import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { chmod, mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";

import {
  OMNI_FILES,
  OMNI_GITIGNORE,
  OmniCodePlugin,
  appendSessionSummary,
  assertProtectedBranchAllowsMutation,
  activePlanningArtifactPaths,
  activeRuntimePaths,
  branchNameToWorkId,
  buildRepoMap,
  buildCollaborationCheckpoint,
  buildPullRequestBody,
  DEFAULT_WORKFLOW_SETTINGS,
  dirtyWorktreeGuidance,
  discoverStandards,
  ensureOmniCodeProjectGitignore,
  ensureOmniDir,
  formatWorkflowSettingsStatus,
  importStandards,
  migrateRootPlanToActiveWork,
  planningArtifactsReady,
  planningArtifactsReadyAt,
  planningGuardMessage,
  readCurrentGitBranch,
  readOmniCodeModelRecommendations,
  readOmniCodeSettings,
  resolvePlanningArtifactReadiness,
  resolveGlobalSettingsPath,
  resolveProjectSettingsPath,
  setOmniMode,
  startWorkBranch,
  suggestSkills,
  summarizePullRequestPrerequisites,
  updateOmniCodeAgentsSettings,
  updateSkillsFile,
  updateStateFile,
  writeFileAtomic,
  validateWorkBranchName,
} from "../src/index.ts";

type MutableOpenCodeConfig = {
  agent?: Record<string, Record<string, unknown>>;
  command?: Record<string, Record<string, unknown>>;
  instructions?: string[];
  default_agent?: string;
};

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

function runGitTest(directory: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn("git", args, { cwd: directory, shell: false });
    let output = "";
    child.stdout?.on("data", (chunk) => {
      output += String(chunk);
    });
    child.stderr?.on("data", (chunk) => {
      output += String(chunk);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`git ${args.join(" ")} failed: ${output}`));
    });
  });
}

async function writeRealPlanningFiles(baseDir: string) {
  await mkdir(baseDir, { recursive: true });
  await writeFile(path.join(baseDir, "SPEC.md"), `${OMNI_FILES["SPEC.md"]}\n## Real\nSpec content\n`, "utf8");
  await writeFile(path.join(baseDir, "TASKS.md"), `${OMNI_FILES["TASKS.md"]}\n## Real\n- [ ] Task\n`, "utf8");
  await writeFile(path.join(baseDir, "TESTS.md"), `${OMNI_FILES["TESTS.md"]}\n## Real\n- [ ] Test\n`, "utf8");
}

async function buildPluginConfig(directory: string): Promise<MutableOpenCodeConfig> {
  const hooks = await OmniCodePlugin({ directory } as never);
  const config: MutableOpenCodeConfig = {};
  if (!hooks.config) throw new Error("OmniCodePlugin did not register config hook");
  await hooks.config(config as never);
  return config;
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
    assert.match(gitignore, /runtime\//);
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

test("readOmniCodeSettings returns workflow defaults when settings files are missing", async () => {
  await withTempDir(async (dir) => {
    const homeDir = path.join(dir, "home");
    const projectDir = path.join(dir, "project");
    await mkdir(projectDir, { recursive: true });

    const settings = await readOmniCodeSettings(projectDir, { homeDir });

    assert.deepEqual(settings.workflow, DEFAULT_WORKFLOW_SETTINGS);
  });
});

test("readOmniCodeSettings merges global defaults with project overrides", async () => {
  await withTempDir(async (dir) => {
    const homeDir = path.join(dir, "home");
    const projectDir = path.join(dir, "project");
    await mkdir(path.dirname(resolveGlobalSettingsPath(homeDir)), { recursive: true });
    await mkdir(path.dirname(resolveProjectSettingsPath(projectDir)), { recursive: true });
    await writeFile(
      resolveGlobalSettingsPath(homeDir),
      JSON.stringify({
        workflow: {
          protectedBranches: ["main", "trunk"],
          requireFeatureBranchForChanges: true,
          allowProtectedBranchChanges: false,
        },
      }),
      "utf8",
    );
    await writeFile(
      resolveProjectSettingsPath(projectDir),
      JSON.stringify({
        workflow: {
          allowProtectedBranchChanges: true,
          offerPrOnCompletion: false,
          autoCreatePrOnCompletion: true,
        },
      }),
      "utf8",
    );

    const settings = await readOmniCodeSettings(projectDir, { homeDir });

    assert.deepEqual(settings.workflow, {
      protectedBranches: ["main", "trunk"],
      requireFeatureBranchForChanges: true,
      allowProtectedBranchChanges: true,
      offerPrOnCompletion: false,
      autoCreatePrOnCompletion: true,
    });
  });
});

test("readOmniCodeSettings ignores invalid workflow settings", async () => {
  await withTempDir(async (dir) => {
    const homeDir = path.join(dir, "home");
    const projectDir = path.join(dir, "project");
    await mkdir(path.dirname(resolveGlobalSettingsPath(homeDir)), { recursive: true });
    await mkdir(path.dirname(resolveProjectSettingsPath(projectDir)), { recursive: true });
    await writeFile(
      resolveGlobalSettingsPath(homeDir),
      JSON.stringify({ workflow: { protectedBranches: [], requireFeatureBranchForChanges: "yes" } }),
      "utf8",
    );
    await writeFile(resolveProjectSettingsPath(projectDir), "not json", "utf8");

    const settings = await readOmniCodeSettings(projectDir, { homeDir });

    assert.deepEqual(settings.workflow, DEFAULT_WORKFLOW_SETTINGS);
  });
});

test("readOmniCodeSettings merges agent settings with project override precedence", async () => {
  await withTempDir(async (dir) => {
    const homeDir = path.join(dir, "home");
    const projectDir = path.join(dir, "project");
    await mkdir(path.join(homeDir, ".omnicode"), { recursive: true });
    await mkdir(path.join(projectDir, ".omnicode"), { recursive: true });
    await writeFile(
      path.join(homeDir, ".omnicode", "settings.json"),
      JSON.stringify({ agents: { enabled: true, defaultModel: "anthropic/global-default", models: { "omni-explorer": "anthropic/global-explorer", "omni-worker": "anthropic/global-worker" } } }, null, 2),
      "utf8",
    );
    await writeFile(
      path.join(projectDir, ".omnicode", "settings.json"),
      JSON.stringify({ agents: { enabled: false, models: { "omni-worker": "openai/project-worker" } } }, null, 2),
      "utf8",
    );

    const settings = await readOmniCodeSettings(projectDir, { homeDir });

    assert.equal(settings.agents.enabled, false);
    assert.equal(settings.agents.defaultModel, "anthropic/global-default");
    assert.deepEqual(settings.agents.models, {
      "omni-explorer": "anthropic/global-explorer",
      "omni-worker": "openai/project-worker",
    });
  });
});

test("ensureOmniCodeProjectGitignore adds project .omnicode settings directory", async () => {
  await withTempDir(async (dir) => {
    await writeFile(path.join(dir, ".gitignore"), "node_modules/\n", "utf8");

    await ensureOmniCodeProjectGitignore(dir);
    await ensureOmniCodeProjectGitignore(dir);

    const gitignore = await readFile(path.join(dir, ".gitignore"), "utf8");
    assert.equal(gitignore.match(/^\.omnicode\/$/gmu)?.length, 1);
    assert.match(gitignore, /^node_modules\/$/m);
  });
});

test("updateOmniCodeAgentsSettings writes scoped settings without copying agent defaults", async () => {
  await withTempDir(async (dir) => {
    const homeDir = path.join(dir, "home");
    const projectDir = path.join(dir, "project");

    const globalResult = await updateOmniCodeAgentsSettings(projectDir, { scope: "global", enabled: true, defaultModel: "anthropic/subagents" }, { homeDir });
    const projectResult = await updateOmniCodeAgentsSettings(projectDir, { scope: "project", models: { "omni-worker": "openai/worker" } }, { homeDir });

    const globalFile = JSON.parse(await readFile(globalResult.outputPath, "utf8"));
    const projectFile = JSON.parse(await readFile(projectResult.outputPath, "utf8"));
    const gitignore = await readFile(path.join(projectDir, ".gitignore"), "utf8");

    assert.deepEqual(globalFile, { agents: { enabled: true, defaultModel: "anthropic/subagents" } });
    assert.deepEqual(projectFile, { agents: { models: { "omni-worker": "openai/worker" } } });
    assert.match(gitignore, /^\.omnicode\/$/m);
  });
});

test("readOmniCodeModelRecommendations prefers project guidance over global guidance", async () => {
  await withTempDir(async (dir) => {
    const homeDir = path.join(dir, "home");
    const projectDir = path.join(dir, "project");
    await mkdir(path.join(homeDir, ".omnicode"), { recursive: true });
    await mkdir(path.join(projectDir, ".omnicode"), { recursive: true });
    await writeFile(path.join(homeDir, ".omnicode", "model-recommendations.md"), "# Global\n", "utf8");
    await writeFile(path.join(projectDir, ".omnicode", "model-recommendations.md"), "# Project\n", "utf8");

    const recommendations = await readOmniCodeModelRecommendations(projectDir, { homeDir });

    assert.equal(recommendations.content, "# Project\n");
    assert.equal(recommendations.sourcePath, path.join(projectDir, ".omnicode", "model-recommendations.md"));
  });
});

test("formatWorkflowSettingsStatus exposes effective workflow policy", async () => {
  const status = formatWorkflowSettingsStatus({
    workflow: {
      protectedBranches: ["main", "release"],
      requireFeatureBranchForChanges: false,
      allowProtectedBranchChanges: true,
      offerPrOnCompletion: true,
      autoCreatePrOnCompletion: false,
    },
  });

  assert.match(status, /Protected Branches: main, release/);
  assert.match(status, /Require Feature Branch For Changes: no/);
  assert.match(status, /Allow Protected Branch Changes: yes/);
  assert.match(status, /Offer PR On Completion: yes/);
  assert.match(status, /Auto Create PR On Completion: no/);
});

test("summarizePullRequestPrerequisites reports missing PR requirements", () => {
  const summary = summarizePullRequestPrerequisites({
    branch: "feat/test",
    dirtyStatus: " M src/index.ts",
    hasRemote: false,
    hasUpstream: false,
  });

  assert.match(summary, /Working tree has uncommitted changes/);
  assert.match(summary, /No git remote is configured/);
  assert.match(summary, /has no upstream/);
});

test("buildPullRequestBody summarizes active planning and commits", async () => {
  await withTempDir(async (dir) => {
    await runGitTest(dir, ["init", "-b", "feat/pr-body"]);
    await writeFile(path.join(dir, "README.md"), "# test\n", "utf8");
    await runGitTest(dir, ["add", "README.md"]);
    await runGitTest(dir, ["-c", "user.email=test@example.com", "-c", "user.name=Test", "commit", "-m", "feat: initial"]);
    const activePaths = await activePlanningArtifactPaths(dir);
    await writeRealPlanningFiles(activePaths.baseDir);

    const body = await buildPullRequestBody(dir);

    assert.match(body, /Branch: feat\/pr-body/);
    assert.match(body, /Active planning: \.omni\/work\/feat-pr-body/);
    assert.match(body, /## Spec/);
    assert.match(body, /feat: initial/);
  });
});

test("readCurrentGitBranch reads branch names from git HEAD", async () => {
  await withTempDir(async (dir) => {
    await mkdir(path.join(dir, ".git"), { recursive: true });
    await writeFile(path.join(dir, ".git", "HEAD"), "ref: refs/heads/feature/collab\n", "utf8");

    assert.equal(await readCurrentGitBranch(dir), "feature/collab");
  });
});

test("assertProtectedBranchAllowsMutation blocks protected branches by default", async () => {
  await withTempDir(async (dir) => {
    await mkdir(path.join(dir, ".git"), { recursive: true });
    await writeFile(path.join(dir, ".git", "HEAD"), "ref: refs/heads/main\n", "utf8");

    await assert.rejects(
      () => assertProtectedBranchAllowsMutation(dir, { workflow: DEFAULT_WORKFLOW_SETTINGS }),
      /change requests should run on a feature branch, not main/,
    );
  });
});

test("assertProtectedBranchAllowsMutation respects protected branch overrides", async () => {
  await withTempDir(async (dir) => {
    await mkdir(path.join(dir, ".git"), { recursive: true });
    await writeFile(path.join(dir, ".git", "HEAD"), "ref: refs/heads/main\n", "utf8");

    await assert.doesNotReject(() => assertProtectedBranchAllowsMutation(dir, {
      workflow: {
        ...DEFAULT_WORKFLOW_SETTINGS,
        allowProtectedBranchChanges: true,
      },
    }));
    await assert.doesNotReject(() => assertProtectedBranchAllowsMutation(dir, {
      workflow: {
        ...DEFAULT_WORKFLOW_SETTINGS,
        requireFeatureBranchForChanges: false,
      },
    }));
  });
});

test("branchNameToWorkId creates filesystem-safe branch slugs", () => {
  assert.equal(branchNameToWorkId("feature/Collaborative Memory"), "feature-collaborative-memory");
  assert.equal(branchNameToWorkId("fix..release__guard"), "fix-release-guard");
  assert.throws(() => branchNameToWorkId("///"), /cannot derive work id/);
});

test("validateWorkBranchName rejects unsafe branch names", () => {
  assert.equal(validateWorkBranchName("feat/collaboration-polish"), "feat/collaboration-polish");
  assert.throws(() => validateWorkBranchName("-bad"), /invalid branch name/);
  assert.throws(() => validateWorkBranchName("feat//bad"), /invalid branch name/);
  assert.throws(() => validateWorkBranchName("feat/bad.lock"), /invalid branch name/);
});

test("dirtyWorktreeGuidance proposes safe dirty checkout solutions", () => {
  const guidance = dirtyWorktreeGuidance("?? src/example.ts");

  assert.match(guidance, /uncommitted changes/);
  assert.match(guidance, /\?\? src\/example\.ts/);
  assert.match(guidance, /Commit the current changes/);
  assert.match(guidance, /git stash push/);
  assert.match(guidance, /allowDirty: true/);
});

test("startWorkBranch refuses dirty checkouts by default", async () => {
  await withTempDir(async (dir) => {
    await runGitTest(dir, ["init", "-b", "main"]);
    await writeFile(path.join(dir, "dirty.txt"), "dirty\n", "utf8");

    const result = await startWorkBranch(dir, { branch: "feat/test" });

    assert.equal(result.action, "blocked-dirty");
    assert.match(result.dirtyStatus, /dirty\.txt/);
    assert.equal(result.activePaths, null);
  });
});

test("startWorkBranch creates branches and initializes active planning files", async () => {
  await withTempDir(async (dir) => {
    await runGitTest(dir, ["init", "-b", "main"]);

    const result = await startWorkBranch(dir, { branch: "feat/test" });
    const branch = await readCurrentGitBranch(dir);

    assert.equal(result.action, "created");
    assert.equal(branch, "feat/test");
    assert.equal(result.activePaths?.workId, "feat-test");
    assert.match(await readFile(path.join(result.activePaths!.baseDir, "SPEC.md"), "utf8"), /# Spec/);
    assert.match(await readFile(path.join(result.activePaths!.baseDir, "TASKS.md"), "utf8"), /# Tasks/);
    assert.match(await readFile(path.join(result.activePaths!.baseDir, "TESTS.md"), "utf8"), /# Tests/);
  });
});

test("startWorkBranch switches to existing branches", async () => {
  await withTempDir(async (dir) => {
    await runGitTest(dir, ["init", "-b", "main"]);
    await writeFile(path.join(dir, "README.md"), "# test\n", "utf8");
    await runGitTest(dir, ["add", "README.md"]);
    await runGitTest(dir, ["-c", "user.email=test@example.com", "-c", "user.name=Test", "commit", "-m", "init"]);
    await runGitTest(dir, ["switch", "-c", "feat/existing"]);
    await runGitTest(dir, ["switch", "main"]);

    const result = await startWorkBranch(dir, { branch: "feat/existing" });

    assert.equal(result.action, "switched");
    assert.equal(await readCurrentGitBranch(dir), "feat/existing");
  });
});

test("activePlanningArtifactPaths selects .omni/work for branch-backed work", async () => {
  await withTempDir(async (dir) => {
    await mkdir(path.join(dir, ".git"), { recursive: true });
    await writeFile(path.join(dir, ".git", "HEAD"), "ref: refs/heads/feature/collab-memory\n", "utf8");

    const paths = await activePlanningArtifactPaths(dir);

    assert.equal(paths.source, "work");
    assert.equal(paths.workId, "feature-collab-memory");
    assert.equal(paths.baseDir, path.join(dir, ".omni", "work", "feature-collab-memory"));
    assert.equal(paths.specPath, path.join(paths.baseDir, "SPEC.md"));
    assert.equal(paths.tasksPath, path.join(paths.baseDir, "TASKS.md"));
    assert.equal(paths.testsPath, path.join(paths.baseDir, "TESTS.md"));
  });
});

test("activePlanningArtifactPaths falls back to root planning when no branch is available", async () => {
  await withTempDir(async (dir) => {
    const paths = await activePlanningArtifactPaths(dir);

    assert.equal(paths.source, "root");
    assert.equal(paths.workId, null);
    assert.equal(paths.baseDir, path.join(dir, ".omni"));
  });
});

test("activeRuntimePaths uses branch slug or root fallback", async () => {
  await withTempDir(async (dir) => {
    assert.equal((await activeRuntimePaths(dir)).baseDir, path.join(dir, ".omni", "runtime", "root"));

    await mkdir(path.join(dir, ".git"), { recursive: true });
    await writeFile(path.join(dir, ".git", "HEAD"), "ref: refs/heads/feat/runtime-state\n", "utf8");

    const branchRuntime = await activeRuntimePaths(dir);
    assert.equal(branchRuntime.runtimeId, "feat-runtime-state");
    assert.equal(branchRuntime.statePath, path.join(dir, ".omni", "runtime", "feat-runtime-state", "STATE.md"));
    assert.equal(branchRuntime.sessionSummaryPath, path.join(dir, ".omni", "runtime", "feat-runtime-state", "SESSION-SUMMARY.md"));
  });
});

test("updateStateFile preserves permissions through atomic replacement", async () => {
  await withTempDir(async (dir) => {
    await ensureOmniDir(dir);
    const runtimePaths = await activeRuntimePaths(dir);
    const statePath = runtimePaths.statePath;
    await mkdir(path.dirname(statePath), { recursive: true });
    await writeFile(statePath, "old\n", "utf8");
    await chmod(statePath, 0o600);

    await updateStateFile(dir, {
      currentPhase: "execution",
      activeTask: "Atomic write slice",
    });

    assert.equal(modeBits((await stat(statePath)).mode), 0o600);
  });
});

test("state and session summaries write to branch-scoped runtime paths", async () => {
  await withTempDir(async (dir) => {
    await mkdir(path.join(dir, ".git"), { recursive: true });
    await writeFile(path.join(dir, ".git", "HEAD"), "ref: refs/heads/feat/runtime-state\n", "utf8");

    const statePath = await updateStateFile(dir, { currentPhase: "execution" });
    const summaryPath = await appendSessionSummary(dir, {
      title: "Runtime branch",
      bullets: ["Wrote branch runtime"],
    });

    assert.equal(statePath, path.join(dir, ".omni", "runtime", "feat-runtime-state", "STATE.md"));
    assert.equal(summaryPath, path.join(dir, ".omni", "runtime", "feat-runtime-state", "SESSION-SUMMARY.md"));
    await assert.rejects(() => stat(path.join(dir, ".omni", "STATE.md")));
    assert.match(await readFile(summaryPath, "utf8"), /Runtime branch/);
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

test("resolvePlanningArtifactReadiness prefers active work planning when ready", async () => {
  await withTempDir(async (dir) => {
    await mkdir(path.join(dir, ".git"), { recursive: true });
    await writeFile(path.join(dir, ".git", "HEAD"), "ref: refs/heads/feature/collab-memory\n", "utf8");
    const activePaths = await activePlanningArtifactPaths(dir);
    await writeRealPlanningFiles(activePaths.baseDir);

    const readiness = await resolvePlanningArtifactReadiness(dir);

    assert.equal(await planningArtifactsReadyAt(activePaths), true);
    assert.equal(readiness.ready, true);
    assert.equal(readiness.readyPaths?.source, "work");
    assert.equal(readiness.usedRootFallback, false);
    assert.equal(await planningArtifactsReady(dir), true);
  });
});

test("resolvePlanningArtifactReadiness uses root fallback when active work planning is missing", async () => {
  await withTempDir(async (dir) => {
    await mkdir(path.join(dir, ".git"), { recursive: true });
    await writeFile(path.join(dir, ".git", "HEAD"), "ref: refs/heads/feature/collab-memory\n", "utf8");
    await ensureOmniDir(dir);
    await writeRealPlanningFiles(path.join(dir, ".omni"));

    const readiness = await resolvePlanningArtifactReadiness(dir);

    assert.equal(readiness.ready, true);
    assert.equal(readiness.readyPaths?.source, "root");
    assert.equal(readiness.usedRootFallback, true);
  });
});

test("migrateRootPlanToActiveWork copies root planning into active work", async () => {
  await withTempDir(async (dir) => {
    await mkdir(path.join(dir, ".git"), { recursive: true });
    await writeFile(path.join(dir, ".git", "HEAD"), "ref: refs/heads/feat/migrate\n", "utf8");
    await ensureOmniDir(dir);
    await writeRealPlanningFiles(path.join(dir, ".omni"));

    const result = await migrateRootPlanToActiveWork(dir);

    assert.deepEqual(result.copied.sort(), [
      ".omni/work/feat-migrate/SPEC.md",
      ".omni/work/feat-migrate/TASKS.md",
      ".omni/work/feat-migrate/TESTS.md",
    ].sort());
    assert.match(await readFile(path.join(result.activePaths.baseDir, "SPEC.md"), "utf8"), /Spec content/);
    assert.match(await readFile(result.notesPath, "utf8"), /Migrated root planning files/);
  });
});

test("migrateRootPlanToActiveWork rejects placeholders and overwrite conflicts", async () => {
  await withTempDir(async (dir) => {
    await mkdir(path.join(dir, ".git"), { recursive: true });
    await writeFile(path.join(dir, ".git", "HEAD"), "ref: refs/heads/feat/migrate\n", "utf8");
    await ensureOmniDir(dir);

    await assert.rejects(() => migrateRootPlanToActiveWork(dir), /nothing to migrate/);

    await writeRealPlanningFiles(path.join(dir, ".omni"));
    const activePaths = await activePlanningArtifactPaths(dir);
    await mkdir(activePaths.baseDir, { recursive: true });
    await writeFile(activePaths.specPath, "existing\n", "utf8");

    await assert.rejects(() => migrateRootPlanToActiveWork(dir), /refusing to overwrite/);
    await assert.doesNotReject(() => migrateRootPlanToActiveWork(dir, { overwrite: true }));
  });
});

test("planningGuardMessage names active work planning with root fallback", async () => {
  await withTempDir(async (dir) => {
    await mkdir(path.join(dir, ".git"), { recursive: true });
    await writeFile(path.join(dir, ".git", "HEAD"), "ref: refs/heads/feature/collab-memory\n", "utf8");

    const readiness = await resolvePlanningArtifactReadiness(dir);
    const message = planningGuardMessage(readiness);

    assert.match(message, /\.omni\/work\/feature-collab-memory/);
    assert.match(message, /Legacy root \.omni\/SPEC\.md/);
  });
});

test("buildCollaborationCheckpoint reports branch, policy, and active planning status", async () => {
  await withTempDir(async (dir) => {
    await mkdir(path.join(dir, ".git"), { recursive: true });
    await writeFile(path.join(dir, ".git", "HEAD"), "ref: refs/heads/feature/collab-memory\n", "utf8");

    const checkpoint = await buildCollaborationCheckpoint(dir);

    assert.match(checkpoint, /# Collaboration Checkpoint/);
    assert.match(checkpoint, /Branch: feature\/collab-memory/);
    assert.match(checkpoint, /Protected Branch Policy: not protected/);
    assert.match(checkpoint, /Active Work ID: feature-collab-memory/);
    assert.match(checkpoint, /Active Planning Directory: \.omni\/work\/feature-collab-memory/);
    assert.match(checkpoint, /Planning Status: not ready/);
  });
});

test("buildCollaborationCheckpoint reports protected branch blocks and root fallback", async () => {
  await withTempDir(async (dir) => {
    await mkdir(path.join(dir, ".git"), { recursive: true });
    await writeFile(path.join(dir, ".git", "HEAD"), "ref: refs/heads/main\n", "utf8");
    await ensureOmniDir(dir);
    await writeRealPlanningFiles(path.join(dir, ".omni"));

    const checkpoint = await buildCollaborationCheckpoint(dir);

    assert.match(checkpoint, /Protected Branch: yes/);
    assert.match(checkpoint, /Protected Branch Policy: blocked for change implementation/);
    assert.match(checkpoint, /Planning Status: ready via legacy root fallback/);
    assert.match(checkpoint, /Next Step: Create or switch to a feature branch/);
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
      ["brainstorming", "grill-me", "omni-execution", "omni-planning", "omni-verification", "tdd"],
    );

    const result = await updateSkillsFile(dir, task);
    const skillsFile = await readFile(path.join(dir, ".omni", "SKILLS.md"), "utf8");

    assert.equal(result.suggested.length, 6);
    assert.match(skillsFile, /## Suggested For Current Work/);
    assert.match(skillsFile, /grill-me/);
    assert.match(skillsFile, /find-skills/);
    assert.match(skillsFile, /skill-maker/);
    assert.match(skillsFile, /tdd/);
    assert.match(skillsFile, /diagnose/);
    assert.match(skillsFile, /grill-with-docs/);
    assert.match(skillsFile, /improve-codebase-architecture/);
    assert.match(skillsFile, /brainstorming/);
    assert.match(skillsFile, /omni-verification/);
  });
});

test("suggestSkills prioritizes grill-me for change requests", async () => {
  const suggestions = await suggestSkills("Add a new onboarding feature and refactor the setup flow");

  assert.equal(suggestions[0]?.name, "grill-me");
  assert.ok(suggestions.some((item) => item.name === "brainstorming"));
  assert.ok(suggestions.some((item) => item.name === "tdd"));
});

test("suggestSkills recommends tdd for behavior-changing implementation", async () => {
  const explicit = await suggestSkills("Use TDD with a red-green-refactor loop for this feature");
  const behavior = await suggestSkills("Update the checkout behavior and add regression tests");

  assert.ok(explicit.some((item) => item.name === "tdd"));
  assert.ok(behavior.some((item) => item.name === "tdd"));
});

test("suggestSkills recommends diagnose for bugs and performance regressions", async () => {
  const bug = await suggestSkills("Diagnose the checkout bug that fails intermittently");
  const performance = await suggestSkills("Debug this performance regression in repo map generation");

  assert.equal(bug[0]?.name, "diagnose");
  assert.ok(performance.some((item) => item.name === "diagnose"));
});

test("suggestSkills recommends grill-with-docs for durable domain decisions", async () => {
  const domain = await suggestSkills("Grill this plan against our domain language and glossary");
  const adr = await suggestSkills("We need an ADR for this durable architecture decision");

  assert.equal(domain[0]?.name, "grill-with-docs");
  assert.ok(adr.some((item) => item.name === "grill-with-docs"));
});

test("suggestSkills recommends improve-codebase-architecture for architecture reviews", async () => {
  const architecture = await suggestSkills("Find deepening opportunities to improve codebase architecture");
  const seams = await suggestSkills("Review shallow modules and test seams before refactoring");

  assert.equal(architecture[0]?.name, "improve-codebase-architecture");
  assert.ok(seams.some((item) => item.name === "improve-codebase-architecture"));
});

test("OmniCodePlugin registers improve-codebase-architecture command", async () => {
  await withTempDir(async (dir) => {
    const plugin = await OmniCodePlugin({ directory: dir } as never);
    const config = {} as {
      command?: Record<string, { description?: string; template?: string }>;
      agent?: Record<string, unknown>;
      instructions?: string[];
    };

    await plugin.config?.(config as never);

    assert.ok(config.command?.["improve-codebase-architecture"]);
    assert.match(config.command["improve-codebase-architecture"].description ?? "", /architecture/i);
    assert.match(config.command["improve-codebase-architecture"].template ?? "", /deepening opportunities/i);
  });
});

test("plugin config registers optional Omni subagents and omni-agents command", async () => {
  await withTempDir(async (dir) => {
    await mkdir(path.join(dir, ".omnicode"), { recursive: true });
    await writeFile(
      path.join(dir, ".omnicode", "settings.json"),
      JSON.stringify({ agents: { enabled: true, defaultModel: "anthropic/shared-subagent", models: { "omni-worker": "openai/worker-model" } } }, null, 2),
      "utf8",
    );

    const config = await buildPluginConfig(dir);
    const agents = config.agent ?? {};
    for (const agentName of ["omni-explorer", "omni-planner", "omni-verifier", "omni-worker"]) {
      assert.equal(agents[agentName]?.mode, "subagent");
      assert.equal(typeof agents[agentName]?.description, "string");
      assert.equal(typeof agents[agentName]?.prompt, "string");
    }
    assert.equal(agents["omni-explorer"]?.model, "anthropic/shared-subagent");
    assert.equal(agents["omni-worker"]?.model, "openai/worker-model");
    assert.deepEqual(agents.omnicode?.permission, {
      task: { "*": "deny", "omni-explorer": "allow", "omni-planner": "allow", "omni-verifier": "allow", "omni-worker": "allow" },
    });

    const command = config.command?.["omni-agents"];
    assert.equal(command?.agent, "omnicode");
    assert.match(String(command?.template), /omnicode_agents_status/);
    assert.match(String(command?.template), /opencode models/);
    assert.match(String(command?.template), /omnicode_update_agents_settings/);
  });
});

test("suggestSkills recommends find-skills for skill discovery and removal requests", async () => {
  const discovery = await suggestSkills("Find relevant skills for React performance work");
  const removal = await suggestSkills("Remove the old deployment skill from the project");

  assert.equal(discovery[0]?.name, "find-skills");
  assert.equal(removal[0]?.name, "find-skills");
});

test("suggestSkills recommends skill-maker for missing skill creation requests", async () => {
  const missing = await suggestSkills("No relevant skill exists for this project-local workflow");
  const creation = await suggestSkills("Create a project-local skill for our release checklist");

  assert.equal(missing[0]?.name, "skill-maker");
  assert.equal(creation[0]?.name, "skill-maker");
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
    const runtimePaths = await activeRuntimePaths(dir);
    let state = await readFile(runtimePaths.statePath, "utf8");
    let config = await readFile(path.join(dir, ".omni", "CONFIG.md"), "utf8");

    assert.match(config, /Omni Mode: on/);
    assert.match(state, /Current Phase: discovery/);
    assert.match(state, /Workspace ready for planning/);

    await setOmniMode(dir, "off");
    state = await readFile(runtimePaths.statePath, "utf8");
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
