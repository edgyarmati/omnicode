import { randomBytes } from "node:crypto";
import { chmod, mkdir, readFile, readdir, realpath, rename, stat, unlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

import type { Plugin } from "@opencode-ai/plugin";
import { tool } from "@opencode-ai/plugin";

type OmniMode = "on" | "off";

type CommandFrontmatter = {
  description?: string;
  agent?: string;
  model?: string;
  subtask?: boolean;
};

type ParsedCommand = {
  name: string;
  frontmatter: CommandFrontmatter;
  template: string;
};

type SkillInfo = {
  name: string;
  description: string;
  path: string;
};

export type SuggestedSkill = {
  name: string;
  reason: string;
  score: number;
};

export type RepoMapEntry = {
  path: string;
  score: number;
  summary: string;
};

export type StandardCandidate = {
  path: string;
  kind: string;
};

export type OmniSubagentName = "omni-explorer" | "omni-planner" | "omni-verifier" | "omni-worker";

export type OmniCodeSettings = {
  agents: {
    enabled: boolean;
    defaultModel?: string;
    models: Partial<Record<OmniSubagentName, string>>;
  };
};

type RawOmniCodeSettings = {
  agents?: {
    enabled?: unknown;
    defaultModel?: unknown;
    models?: unknown;
  };
};

const OMNI_VERSION = "1";
const RESOURCE_ROOT_CANDIDATES = [
  path.join(import.meta.dirname, "resources"),
  path.join(import.meta.dirname, "..", "src", "resources"),
];

const STANDARD_RULES: Array<{ kind: string; match(relativePath: string, basename: string): boolean }> = [
  {
    kind: "AGENTS",
    match: (_relativePath, basename) => basename === "AGENTS.md",
  },
  {
    kind: "CLAUDE",
    match: (_relativePath, basename) => basename === "CLAUDE.md",
  },
  {
    kind: "GEMINI",
    match: (_relativePath, basename) => basename === "GEMINI.md",
  },
  {
    kind: "Copilot",
    match: (relativePath) => relativePath === ".github/copilot-instructions.md",
  },
  {
    kind: "GitHub Instructions",
    match: (relativePath, basename) =>
      relativePath.startsWith(".github/instructions/") && basename.endsWith(".instructions.md"),
  },
  {
    kind: "Cursor Rules",
    match: (relativePath, basename) =>
      basename === ".cursorrules" ||
      (relativePath.startsWith(".cursor/rules/") && basename.endsWith(".mdc")),
  },
  {
    kind: "Windsurf Rules",
    match: (relativePath) => relativePath.startsWith(".windsurf/rules/"),
  },
  {
    kind: "Continue Rules",
    match: (relativePath) => relativePath.startsWith(".continue/rules/"),
  },
];

export const REPO_MAP_IGNORE = new Set([
  ".git",
  "node_modules",
  ".next",
  "dist",
  "build",
  ".pi",
  ".omni",
  ".omnicode",
  ".turbo",
  "coverage",
]);

const OMNICODE_SETTINGS_DIR = ".omnicode";
const OMNICODE_SETTINGS_FILE = "settings.json";
const OMNICODE_PROJECT_GITIGNORE_ENTRY = `${OMNICODE_SETTINGS_DIR}/`;
const OMNI_SUBAGENT_NAMES: OmniSubagentName[] = [
  "omni-explorer",
  "omni-planner",
  "omni-verifier",
  "omni-worker",
];

function emptyOmniCodeSettings(): OmniCodeSettings {
  return {
    agents: {
      enabled: false,
      models: {},
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeAgentModels(value: unknown): Partial<Record<OmniSubagentName, string>> {
  if (!isRecord(value)) return {};

  const models: Partial<Record<OmniSubagentName, string>> = {};
  for (const agentName of OMNI_SUBAGENT_NAMES) {
    const model = value[agentName];
    if (typeof model === "string" && model.trim().length > 0) {
      models[agentName] = model.trim();
    }
  }
  return models;
}

function normalizeOmniCodeSettings(raw: unknown): Partial<OmniCodeSettings> {
  if (!isRecord(raw)) return {};
  const settings = raw as RawOmniCodeSettings;
  if (!isRecord(settings.agents)) return {};

  const agents: Partial<OmniCodeSettings["agents"]> = {};
  if (typeof settings.agents.enabled === "boolean") {
    agents.enabled = settings.agents.enabled;
  }
  if (typeof settings.agents.defaultModel === "string" && settings.agents.defaultModel.trim().length > 0) {
    agents.defaultModel = settings.agents.defaultModel.trim();
  }

  agents.models = normalizeAgentModels(settings.agents.models);
  return { agents: agents as OmniCodeSettings["agents"] };
}

function mergeOmniCodeSettings(base: OmniCodeSettings, override: Partial<OmniCodeSettings>): OmniCodeSettings {
  return {
    agents: {
      enabled: override.agents?.enabled ?? base.agents.enabled,
      defaultModel: override.agents?.defaultModel ?? base.agents.defaultModel,
      models: {
        ...base.agents.models,
        ...(override.agents?.models ?? {}),
      },
    },
  };
}

async function readSettingsFile(filePath: string): Promise<Partial<OmniCodeSettings>> {
  try {
    return normalizeOmniCodeSettings(JSON.parse(await readFile(filePath, "utf8")));
  } catch {
    return {};
  }
}

export function globalOmniCodeSettingsPath(homeDir = os.homedir()): string {
  return path.join(homeDir, OMNICODE_SETTINGS_DIR, OMNICODE_SETTINGS_FILE);
}

export function projectOmniCodeSettingsPath(directory: string): string {
  return path.join(directory, OMNICODE_SETTINGS_DIR, OMNICODE_SETTINGS_FILE);
}

export async function readOmniCodeSettings(
  directory: string,
  options: { homeDir?: string } = {},
): Promise<OmniCodeSettings> {
  const globalSettings = await readSettingsFile(globalOmniCodeSettingsPath(options.homeDir));
  const projectSettings = await readSettingsFile(projectOmniCodeSettingsPath(directory));

  return mergeOmniCodeSettings(
    mergeOmniCodeSettings(emptyOmniCodeSettings(), globalSettings),
    projectSettings,
  );
}

export async function ensureOmniCodeProjectGitignore(directory: string): Promise<string> {
  const gitignorePath = path.join(directory, ".gitignore");
  let existing = "";
  try {
    existing = await readFile(gitignorePath, "utf8");
  } catch {
    existing = "";
  }

  const lines = existing.split(/\r?\n/u).map((line) => line.trim());
  if (lines.includes(OMNICODE_PROJECT_GITIGNORE_ENTRY)) {
    return gitignorePath;
  }

  const prefix = existing.length === 0 || existing.endsWith("\n") ? existing : `${existing}\n`;
  await writeFileAtomic(gitignorePath, `${prefix}${OMNICODE_PROJECT_GITIGNORE_ENTRY}\n`);
  return gitignorePath;
}

const SKILL_RULES: Array<{ name: string; patterns: RegExp[]; reason: string; score: number }> = [
  {
    name: "find-skills",
    patterns: [
      /\b(find|search|discover|install|add|remove|delete)\b[^.!?\n]{0,80}\bskills?\b/iu,
      /\b(skills?|capabilit(?:y|ies))\b[^.!?\n]{0,80}\b(missing|insufficient|not covered|need|available|relevant)\b/iu,
      /\b(is there|do we have|are there)\b[^.!?\n]{0,80}\bskills?\b/iu,
    ],
    reason: "use during the skill-fit checkpoint to find or remove relevant skills",
    score: 5,
  },
  {
    name: "grill-me",
    patterns: [
      /\b(grill me|stress[- ]test|poke holes|challenge (?:this|my)|what am i missing)\b/iu,
      /\b(add|build|create|change|modify|update|fix|refactor|implement|feature|bug|behavior change)\b/iu,
    ],
    reason: "use automatically before change requests to reach shared understanding",
    score: 5,
  },
  {
    name: "brainstorming",
    patterns: [
      /\b(brainstorm|design|approach|option|trade-?off|migration|feature|behavior change|refactor)\b/iu,
      /\b(create|build|add|modify|change)\b/iu,
    ],
    reason: "use before creative work, migrations, or behavior changes",
    score: 3,
  },
  {
    name: "omni-planning",
    patterns: [/\b(plan|spec|task|slice|break down|roadmap|implementation plan)\b/iu],
    reason: "use before implementation to refine spec, tasks, and tests",
    score: 4,
  },
  {
    name: "omni-execution",
    patterns: [/\b(implement|execute|code|fix|do the task|build it|make it work)\b/iu],
    reason: "use when implementing a planned slice",
    score: 4,
  },
  {
    name: "omni-verification",
    patterns: [/\b(test|verify|check|validate|did it work|smoke test|regression)\b/iu],
    reason: "use after implementation to verify and summarize pass/fail",
    score: 4,
  },
];

const REPO_MAP_MAX_SUMMARY_BYTES = 128 * 1024;
const SKILLS_PROJECT_NOTES_HEADING = "## Project Notes";

function tempPathFor(filePath: string): string {
  return `${filePath}.${randomBytes(6).toString("hex")}.tmp`;
}

async function existingMode(filePath: string): Promise<number | undefined> {
  try {
    return (await stat(filePath)).mode & 0o777;
  } catch {
    return undefined;
  }
}

export async function writeFileAtomic(filePath: string, content: string | Uint8Array): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  const tempPath = tempPathFor(filePath);
  const mode = await existingMode(filePath);

  try {
    await writeFile(tempPath, content, { encoding: "utf8", flag: "wx" });
    if (mode !== undefined) {
      await chmod(tempPath, mode);
    }
    await rename(tempPath, filePath);
  } catch (error) {
    try {
      await unlink(tempPath);
    } catch {
      // Best-effort cleanup only.
    }
    throw error;
  }
}

function sanitizeMarkdownInline(value: string, maxLen = 240): string {
  const cleaned = value
    .replace(/[\u0000-\u001f\u007f]/gu, " ")
    .replace(/`/gu, "'")
    .replace(/(^|\s)#{1,6}\s+/gu, "$1")
    .replace(/(^|\s)[-+*]\s+/gu, "$1")
    .replace(/(^|\s)---(?:\s|$)/gu, "$1")
    .replace(/\s+/gu, " ")
    .trim()
    .slice(0, maxLen)
    .trim();
  return cleaned.length > 0 ? cleaned : "None";
}

function markdownFenceFor(content: string): string {
  const runs = content.match(/`{3,}/gu) ?? [];
  const longest = runs.reduce((max, run) => Math.max(max, run.length), 3);
  return "`".repeat(longest + 1);
}

export const OMNI_RUNTIME_FILES = [
  "STATE.md",
  "SESSION-SUMMARY.md",
  "REPO-MAP.md",
  "REPO-MAP.json",
] as const;

export const OMNI_DURABLE_FILES = [
  "PROJECT.md",
  "SPEC.md",
  "TASKS.md",
  "TESTS.md",
  "DECISIONS.md",
  "STANDARDS.md",
  "SKILLS.md",
  "CONFIG.md",
  "VERSION",
] as const;

export const OMNI_GITIGNORE = [
  "# Runtime OmniCode state: keep out of git by default.",
  "STATE.md",
  "SESSION-SUMMARY.md",
  "REPO-MAP.md",
  "REPO-MAP.json",
  "",
  "# Durable OmniCode memory may be committed when it reflects real project intent.",
].join("\n");

export const OMNI_FILES: Record<string, string> = {
  "PROJECT.md": "# Project\n\n## Goal\n\nDescribe what this project is trying to achieve.\n\n## Users\n\nDescribe the primary users or stakeholders.\n\n## Constraints\n\nList important product, technical, or workflow constraints.\n\n## Success Criteria\n\nList the observable outcomes that mean the work is successful.\n",
  "SPEC.md": "# Spec\n\n## Problem\n\nDescribe the specific problem to solve.\n\n## Requested Behavior\n\nList the expected behavior clearly before implementation.\n\n## Constraints\n\nList any implementation constraints or non-goals.\n\n## Success Criteria\n\nList concrete checks that make this request complete.\n",
  "TASKS.md": "# Tasks\n\n## Planned slices\n\n- [ ] Slice 1: define the first bounded implementation step\n\n## Notes\n\nBreak work into bounded, verifiable slices before editing source files.\n",
  "TESTS.md": "# Tests\n\n## Checks\n\n- [ ] define the checks to run after each implementation slice\n\n## Expected outcomes\n\nDescribe what passing looks like.\n",
  "STATE.md": "# State\n\nCurrent Phase: discovery\nActive Task: bootstrap\nStatus Summary: OmniCode workspace bootstrapped and ready for planning.\nBlockers: None\nNext Step: Clarify scope, write spec, define tests, and break work into tasks before implementation.\n",
  "DECISIONS.md": "# Decisions\n\nRecord important choices and why they were made.\n",
  "STANDARDS.md": "# Imported Standards\n\nRecord imported standards from AGENTS.md, CLAUDE.md, Cursor rules, and similar files.\n",
  "SKILLS.md": "# Skills\n\n## Bundled\n\n- grill-me\n- find-skills\n- brainstorming\n- omni-planning\n- omni-execution\n- omni-verification\n\n## Suggested For Current Work\n\n- None inferred from the current task yet.\n\n## Project Notes\n\nRecord required and project-specific skills here.\n",
  "SESSION-SUMMARY.md": "# Session Summary\n\n## Progress Made\n\n- Bootstrapped OmniCode durable memory for this project.\n\n## Remaining Work\n\n- Clarify the request and write the first real spec, tasks, and tests.\n\n## Notes\n\nUse this file for concise cross-session handoff notes.\n",
  "CONFIG.md": "# Omni Configuration\n\nOmni Mode: on\n",
  VERSION: `${OMNI_VERSION}\n`,
};

function parseFrontmatter(content: string): {
  frontmatter: CommandFrontmatter;
  body: string;
} {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/u);
  if (!match) {
    return { frontmatter: {}, body: content.trim() };
  }

  const [, yamlContent, body] = match;
  const frontmatter: CommandFrontmatter = {};
  for (const line of yamlContent.split("\n")) {
    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) continue;
    const key = line.slice(0, colonIndex).trim();
    const value = line.slice(colonIndex + 1).trim();
    if (key === "description") frontmatter.description = value;
    if (key === "agent") frontmatter.agent = value;
    if (key === "model") frontmatter.model = value;
    if (key === "subtask") frontmatter.subtask = value === "true";
  }
  return { frontmatter, body: body.trim() };
}

async function resolveResourcePath(...parts: string[]): Promise<string> {
  for (const candidateRoot of RESOURCE_ROOT_CANDIDATES) {
    const candidate = path.join(candidateRoot, ...parts);
    try {
      await stat(candidate);
      return candidate;
    } catch {
      // try next candidate
    }
  }

  throw new Error(
    `OmniCode resources not found for ${parts.join("/")}. Checked: ${RESOURCE_ROOT_CANDIDATES.join(", ")}`,
  );
}

async function loadCommands(): Promise<ParsedCommand[]> {
  const commandDir = await resolveResourcePath("commands");
  const entries = await readdir(commandDir, { withFileTypes: true });
  const commands: ParsedCommand[] = [];

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
    const filePath = path.join(commandDir, entry.name);
    const content = await readFile(filePath, "utf8");
    const { frontmatter, body } = parseFrontmatter(content);
    commands.push({
      name: entry.name.replace(/\.md$/u, ""),
      frontmatter,
      template: body,
    });
  }

  return commands.sort((a, b) => a.name.localeCompare(b.name));
}

export async function ensureOmniDir(directory: string): Promise<string> {
  const omniDir = path.join(directory, ".omni");
  await mkdir(omniDir, { recursive: true });
  for (const [fileName, content] of Object.entries(OMNI_FILES)) {
    const filePath = path.join(omniDir, fileName);
    try {
      await stat(filePath);
    } catch {
      await writeFileAtomic(filePath, content);
    }
  }

  const gitignorePath = path.join(omniDir, ".gitignore");
  try {
    await stat(gitignorePath);
  } catch {
    await writeFileAtomic(gitignorePath, `${OMNI_GITIGNORE}\n`);
  }

  return omniDir;
}

async function readOmniConfig(directory: string): Promise<string> {
  try {
    return await readFile(path.join(directory, ".omni", "CONFIG.md"), "utf8");
  } catch {
    return "";
  }
}

async function readOmniMode(directory: string): Promise<OmniMode> {
  const config = await readOmniConfig(directory);
  return /Omni Mode:\s*off/iu.test(config) ? "off" : "on";
}

async function inferProjectGoal(directory: string): Promise<string> {
  try {
    const packageJson = JSON.parse(
      await readFile(path.join(directory, "package.json"), "utf8"),
    ) as { name?: string; description?: string };
    const pieces = [packageJson.name, packageJson.description].filter(Boolean);
    if (pieces.length > 0) {
      return pieces.join(" — ");
    }
  } catch {
    // ignore missing/invalid package.json
  }

  return "Describe what this project is trying to achieve.";
}

async function initializeProjectFile(directory: string): Promise<void> {
  const omniDir = await ensureOmniDir(directory);
  const projectPath = path.join(omniDir, "PROJECT.md");
  const current = await readFile(projectPath, "utf8").catch(() => OMNI_FILES["PROJECT.md"]);
  if (current.trim() !== OMNI_FILES["PROJECT.md"].trim()) {
    return;
  }

  const inferredGoal = await inferProjectGoal(directory);
  const content = [
    "# Project",
    "",
    "## Goal",
    "",
    inferredGoal,
    "",
    "## Users",
    "",
    "Describe the primary users or stakeholders.",
    "",
    "## Constraints",
    "",
    "List important product, technical, or workflow constraints.",
    "",
    "## Success Criteria",
    "",
    "List the observable outcomes that mean the work is successful.",
    "",
  ].join("\n");
  await writeFileAtomic(projectPath, content);
}

export async function setOmniMode(directory: string, mode: OmniMode): Promise<void> {
  const omniDir = await ensureOmniDir(directory);
  await writeFileAtomic(
    path.join(omniDir, "CONFIG.md"),
    `# Omni Configuration\n\nOmni Mode: ${mode}\n`,
  );

  if (mode === "on") {
    await updateStateFile(directory, {
      currentPhase: "discovery",
      activeTask: "bootstrap",
      statusSummary: "Omni mode enabled. Workspace ready for planning.",
      blockers: [],
      nextStep: "Clarify scope, write spec, define tests, and break work into tasks before implementation.",
    });
    return;
  }

  await updateStateFile(directory, {
    currentPhase: "passive",
    activeTask: "",
    statusSummary: "Omni mode disabled. Durable .omni context remains available as passive guidance.",
    blockers: [],
    nextStep: "Re-enable Omni mode when you want the full planning and verification workflow.",
  });
}

async function readStateSummary(directory: string): Promise<string> {
  try {
    return await readFile(path.join(directory, ".omni", "STATE.md"), "utf8");
  } catch {
    return "No .omni/STATE.md found.";
  }
}

function normalizeListItems(items: string[]): string {
  const cleaned = items.map((item) => sanitizeMarkdownInline(item)).filter(Boolean);
  return cleaned.length > 0 ? cleaned.join("; ") : "None";
}

export async function updateStateFile(
  directory: string,
  updates: {
    currentPhase?: string;
    activeTask?: string;
    statusSummary?: string;
    blockers?: string[];
    nextStep?: string;
  },
): Promise<string> {
  const omniDir = await ensureOmniDir(directory);
  const nextState = {
    currentPhase: sanitizeMarkdownInline(updates.currentPhase ?? "discovery", 80),
    activeTask: updates.activeTask ? sanitizeMarkdownInline(updates.activeTask, 160) : "",
    statusSummary: updates.statusSummary
      ? sanitizeMarkdownInline(updates.statusSummary, 300)
      : "OmniCode workspace bootstrapped and ready for planning.",
    blockers: normalizeListItems(updates.blockers ?? []),
    nextStep: updates.nextStep
      ? sanitizeMarkdownInline(updates.nextStep, 300)
      : "Clarify scope, write spec, define tests, and break work into tasks before implementation.",
  };

  const content = [
    "# State",
    "",
    `Current Phase: ${nextState.currentPhase}`,
    `Active Task: ${nextState.activeTask}`,
    `Status Summary: ${nextState.statusSummary}`,
    `Blockers: ${nextState.blockers}`,
    `Next Step: ${nextState.nextStep}`,
    "",
  ].join("\n");

  const outputPath = path.join(omniDir, "STATE.md");
  await writeFileAtomic(outputPath, content);
  return outputPath;
}

export async function appendSessionSummary(
  directory: string,
  entry: {
    title: string;
    bullets: string[];
  },
): Promise<string> {
  const omniDir = await ensureOmniDir(directory);
  const summaryPath = path.join(omniDir, "SESSION-SUMMARY.md");
  const current = await readFile(summaryPath, "utf8").catch(() => OMNI_FILES["SESSION-SUMMARY.md"]);
  const title = sanitizeMarkdownInline(entry.title || "Update", 120);
  const bullets = entry.bullets.map((bullet) => sanitizeMarkdownInline(bullet, 240));
  const section = [
    "",
    `## ${title}`,
    "",
    ...bullets.map((bullet) => `- ${bullet}`),
    "",
  ].join("\n");
  const next = `${current.trimEnd()}${section}`;
  await writeFileAtomic(summaryPath, `${next}\n`);
  return summaryPath;
}

async function listSkills(): Promise<SkillInfo[]> {
  const skillDir = await resolveResourcePath("skills");
  const entries = await readdir(skillDir, { withFileTypes: true });
  const skills: SkillInfo[] = [];

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
    const filePath = path.join(skillDir, entry.name);
    const content = await readFile(filePath, "utf8");
    const lines = content.split("\n");
    const title = lines[0]?.replace(/^#\s*/u, "").trim() || entry.name;
    const description = lines.find((line) => line.trim().length > 0 && !line.startsWith("#"))?.trim() || "";
    skills.push({
      name: entry.name.replace(/\.md$/u, ""),
      description: description || title,
      path: filePath,
    });
  }

  return skills.sort((a, b) => a.name.localeCompare(b.name));
}

// Skill names are user-controllable through the omnicode_read_skill tool, and
// the resolved path is read from disk. Restrict to a safe character set so
// `..` / slashes / null bytes can't escape the bundled skills directory.
const SAFE_SKILL_NAME = /^[A-Za-z0-9_][A-Za-z0-9_-]{0,63}$/u;

async function readSkill(name: string): Promise<string> {
  if (!SAFE_SKILL_NAME.test(name)) {
    throw new Error(`OmniCode: refusing to read skill with unsafe name: ${name}`);
  }
  const filePath = await resolveResourcePath("skills", `${name}.md`);
  return readFile(filePath, "utf8");
}

function isRepoMapFile(name: string): boolean {
  return /\.(ts|tsx|js|jsx|json|md|sh|yml|yaml)$/u.test(name);
}

function scoreRepoMapPath(relativePath: string): number {
  let score = 0;
  const depth = relativePath.split("/").length - 1;
  const basename = path.posix.basename(relativePath);

  if (basename === "package.json") score += 15;
  if (basename === "README.md") score += 12;
  if (basename === "AGENTS.md") score += 11;
  if (basename === "tsconfig.json") score += 8;
  if (basename === "opencode.json") score += 8;
  if (relativePath.startsWith("src/")) score += 8;
  if (relativePath.startsWith("packages/")) score += 7;
  if (relativePath.startsWith("docs/")) score += 5;
  if (relativePath.includes("index.")) score += 4;
  if (/\b(test|spec)\b/u.test(relativePath)) score += 2;
  score += Math.max(0, 5 - depth);

  return score;
}

async function summarizeRepoMapFile(directory: string, relativePath: string): Promise<string> {
  const fullPath = path.join(directory, relativePath);
  const fileStat = await stat(fullPath);
  if (fileStat.size > REPO_MAP_MAX_SUMMARY_BYTES) {
    return `large file skipped (${fileStat.size} bytes)`;
  }
  const content = await readFile(fullPath, "utf8");
  const basename = path.posix.basename(relativePath);

  if (basename === "package.json") {
    try {
      const parsed = JSON.parse(content) as { name?: string; description?: string };
      return sanitizeMarkdownInline(
        [parsed.name, parsed.description].filter(Boolean).join(" — ") || "package manifest",
      );
    } catch {
      return "package manifest";
    }
  }

  if (basename.endsWith(".md")) {
    const heading = content.match(/^#\s+(.+)$/mu)?.[1]?.trim();
    return heading ? `markdown: ${sanitizeMarkdownInline(heading)}` : "markdown document";
  }

  const exportMatch = content.match(/export\s+(?:default\s+)?(?:async\s+)?(?:function|const|class)\s+([A-Za-z0-9_]+)/u);
  if (exportMatch) {
    return `exports ${sanitizeMarkdownInline(exportMatch[1], 80)}`;
  }

  const importCount = (content.match(/^import\s/gu) ?? []).length;
  if (importCount > 0) {
    return `${importCount} imports`;
  }

  return "source/config file";
}

async function mapWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  let cursor = 0;

  async function worker(): Promise<void> {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(items[index]);
    }
  }

  const workerCount = Math.min(concurrency, items.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}

async function collectRepoMapEntries(directory: string): Promise<RepoMapEntry[]> {
  const filePaths: string[] = [];

  async function walk(currentDir: string, depth: number): Promise<void> {
    if (depth > 4) return;
    const dirEntries = await readdir(currentDir, { withFileTypes: true });
    for (const entry of dirEntries) {
      if (REPO_MAP_IGNORE.has(entry.name)) continue;
      const fullPath = path.join(currentDir, entry.name);
      const relativePath = path.relative(directory, fullPath).split(path.sep).join("/");

      if (entry.isDirectory()) {
        await walk(fullPath, depth + 1);
        continue;
      }

      if (!isRepoMapFile(entry.name)) continue;
      filePaths.push(relativePath);
    }
  }

  await walk(directory, 0);
  const entries = await mapWithConcurrency(filePaths, 16, async (relativePath) => ({
    path: relativePath,
    score: scoreRepoMapPath(relativePath),
    summary: await summarizeRepoMapFile(directory, relativePath),
  }));
  return entries.sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));
}

export async function buildRepoMap(directory: string): Promise<string> {
  const omniDir = await ensureOmniDir(directory);
  const entries = await collectRepoMapEntries(directory);
  const topEntries = entries.slice(0, 60);
  const summary = [
    "# Repo Map",
    "",
    `Root: ${directory}`,
    `Indexed files: ${entries.length}`,
    "",
    "## Ranked files",
    "",
    ...topEntries.map(
      (entry) =>
        `- [${entry.score}] ${sanitizeMarkdownInline(entry.path, 180)} — ${sanitizeMarkdownInline(entry.summary)}`,
    ),
  ].join("\n");

  await writeFileAtomic(path.join(omniDir, "REPO-MAP.md"), `${summary}\n`);
  await writeFileAtomic(path.join(omniDir, "REPO-MAP.json"), `${JSON.stringify(topEntries, null, 2)}\n`);
  return summary;
}

export async function suggestSkills(task: string): Promise<SuggestedSkill[]> {
  const normalized = task.trim();
  const results = new Map<string, SuggestedSkill>();

  for (const rule of SKILL_RULES) {
    const matches = rule.patterns.filter((pattern) => pattern.test(normalized)).length;
    if (matches === 0) continue;
    results.set(rule.name, {
      name: rule.name,
      reason: rule.reason,
      score: rule.score + matches - 1,
    });
  }

  return [...results.values()].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}

export async function updateSkillsFile(
  directory: string,
  task: string,
): Promise<{ suggested: SuggestedSkill[]; outputPath: string }> {
  const omniDir = await ensureOmniDir(directory);
  const outputPath = path.join(omniDir, "SKILLS.md");
  const existing = await readFile(outputPath, "utf8").catch(() => "");
  const existingProjectNotes = existing.includes(SKILLS_PROJECT_NOTES_HEADING)
    ? existing.slice(existing.indexOf(SKILLS_PROJECT_NOTES_HEADING) + SKILLS_PROJECT_NOTES_HEADING.length).trim()
    : "Record required and project-specific skills here.";
  const suggested = await suggestSkills(task);
  const sections = [
    "# Skills",
    "",
    "## Bundled",
    "",
    "- grill-me",
    "- find-skills",
    "- brainstorming",
    "- omni-planning",
    "- omni-execution",
    "- omni-verification",
    "",
    "## Suggested For Current Work",
    "",
  ];

  if (suggested.length === 0) {
    sections.push("- None inferred from the current task yet.");
  } else {
    sections.push(...suggested.map((skill) => `- ${skill.name}: ${skill.reason}`));
  }

  sections.push("", SKILLS_PROJECT_NOTES_HEADING, "", existingProjectNotes);
  await writeFileAtomic(outputPath, `${sections.join("\n")}\n`);
  return { suggested, outputPath };
}

export async function discoverStandards(directory: string): Promise<StandardCandidate[]> {
  const ignore = new Set([
    ".git",
    "node_modules",
    ".next",
    "dist",
    "build",
    ".pi",
    ".omni",
    ".turbo",
    "coverage",
  ]);
  const found = new Map<string, StandardCandidate>();

  async function walk(currentDir: string): Promise<void> {
    const entries = await readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      if (ignore.has(entry.name)) continue;

      const fullPath = path.join(currentDir, entry.name);
      const relativePath = path.relative(directory, fullPath).split(path.sep).join("/");

      if (entry.isDirectory()) {
        await walk(fullPath);
        continue;
      }

      for (const rule of STANDARD_RULES) {
        if (rule.match(relativePath, entry.name)) {
          found.set(relativePath, {
            path: relativePath,
            kind: rule.kind,
          });
          break;
        }
      }
    }
  }

  await walk(directory);
  return [...found.values()].sort((a, b) => a.path.localeCompare(b.path));
}

export async function importStandards(
  directory: string,
  selectedPaths?: string[],
): Promise<{ imported: StandardCandidate[]; outputPath: string }> {
  const omniDir = await ensureOmniDir(directory);
  const candidates = await discoverStandards(directory);
  const normalizedSelected = new Set((selectedPaths ?? []).map((item) => item.replaceAll("\\", "/")));
  const imported =
    normalizedSelected.size > 0
      ? candidates.filter((candidate) => normalizedSelected.has(candidate.path))
      : candidates;

  // Resolve the project root once so we can verify each imported file lives
  // under it. discoverStandards uses path.relative on entries it walked, but
  // the walker doesn't refuse symlinks — without this check, a symlinked
  // standards file pointing outside the repo would still be read.
  const resolvedRoot = await realpath(directory);

  const sections: string[] = ["# Imported Standards", ""];

  if (imported.length === 0) {
    sections.push("No external standards were discovered.");
  } else {
    sections.push(
      "These standards were discovered from common agent-instruction locations and imported into OmniCode durable memory.",
      "",
    );

    for (const candidate of imported) {
      const fullPath = path.resolve(directory, candidate.path);
      const realFullPath = await realpath(fullPath);
      if (realFullPath !== resolvedRoot && !realFullPath.startsWith(resolvedRoot + path.sep)) {
        throw new Error(
          `OmniCode: refusing to import standards file outside project root: ${candidate.path}`,
        );
      }
      const content = await readFile(realFullPath, "utf8");
      const fence = markdownFenceFor(content);
      sections.push(
        `## ${sanitizeMarkdownInline(candidate.kind, 80)}: ${sanitizeMarkdownInline(candidate.path, 180)}`,
        "",
        `${fence}md`,
        content.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/gu, ""),
        fence,
        "",
      );
    }
  }

  const outputPath = path.join(omniDir, "STANDARDS.md");
  await writeFileAtomic(outputPath, `${sections.join("\n").trimEnd()}\n`);
  return { imported, outputPath };
}

async function readInstructionPrompt(): Promise<string> {
  const instructionFile = await resolveResourcePath(
    "instructions",
    "omnicode-agent.md",
  );
  return readFile(instructionFile, "utf8");
}

async function checkRtkAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    const cmd = process.platform === "win32" ? "where" : "which";
    const probe = spawn(cmd, ["rtk"], { stdio: "ignore", shell: false });
    probe.on("exit", (code) => resolve(code === 0));
    probe.on("error", () => resolve(false));
  });
}

export async function planningArtifactsReady(directory: string): Promise<boolean> {
  const specPath = path.join(directory, ".omni", "SPEC.md");
  const tasksPath = path.join(directory, ".omni", "TASKS.md");
  const testsPath = path.join(directory, ".omni", "TESTS.md");

  try {
    const [specContent, tasksContent, testsContent] = await Promise.all([
      readFile(specPath, "utf8"),
      readFile(tasksPath, "utf8"),
      readFile(testsPath, "utf8"),
    ]);

    const normalizedSpec = specContent.trim();
    const normalizedTasks = tasksContent.trim();
    const normalizedTests = testsContent.trim();
    const defaultSpec = OMNI_FILES["SPEC.md"].trim();
    const defaultTasks = OMNI_FILES["TASKS.md"].trim();
    const defaultTests = OMNI_FILES["TESTS.md"].trim();

    return (
      normalizedSpec.length > defaultSpec.length &&
      normalizedTasks.length > defaultTasks.length &&
      normalizedTests.length > defaultTests.length &&
      normalizedSpec !== defaultSpec &&
      normalizedTasks !== defaultTasks &&
      normalizedTests !== defaultTests
    );
  } catch {
    return false;
  }
}

function extractFilePath(args: Record<string, unknown>): string | null {
  const candidateKeys = ["filePath", "path", "target", "filename"];
  for (const key of candidateKeys) {
    const value = args[key];
    if (typeof value === "string" && value.length > 0) return value;
  }
  return null;
}

async function isInsideProjectOmniDir(directory: string, targetPath: string): Promise<boolean> {
  const absoluteTarget = path.resolve(directory, targetPath);
  const omniDir = path.resolve(directory, ".omni");
  const relative = path.relative(omniDir, absoluteTarget);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function isPotentiallyMutatingBashCommand(command: string): boolean {
  const normalized = command.replace(/\\\n/gu, " ");
  return (
    /(^|[;&|()]\s*)(?:sudo\s+)?(?:rm|mv|cp|touch|mkdir|rmdir|ln|chmod|chown|install|tee|truncate|python(?:3)?|node|perl|ruby|sh|bash|zsh)\b/u.test(normalized) ||
    /(^|[^<>])>\s*[^&\s]/u.test(normalized) ||
    />>\s*\S/u.test(normalized) ||
    /\b(?:sed|perl)\b[^\n;|&]*\s-i(?:\s|$)/u.test(normalized)
  );
}

export const OmniCodePlugin: Plugin = async ({ directory }) => {
  const commands = await loadCommands();
  const instructionPrompt = await readInstructionPrompt();
  const rtkAvailable = await checkRtkAvailable();

  return {
    async config(config) {
      config.agent = config.agent ?? {};
      config.command = config.command ?? {};
      config.instructions = Array.isArray(config.instructions)
        ? config.instructions
        : [];

      config.agent.omnicode = {
        description:
          "OmniCode workflow agent: clarify, spec, task, implement in bounded slices, then verify.",
        prompt: instructionPrompt,
      };

      const mutableConfig = config as Record<string, unknown>;
      if (typeof mutableConfig.default_agent !== "string") {
        mutableConfig.default_agent = "omnicode";
      }

      for (const command of commands) {
        config.command[command.name] = {
          template: command.template,
          description: command.frontmatter.description,
          agent: command.frontmatter.agent ?? "omnicode",
          model: command.frontmatter.model,
          subtask: command.frontmatter.subtask,
        };
      }
    },

    event: async ({ event }) => {
      if (event.type === "session.created") {
        await ensureOmniDir(directory);
        await initializeProjectFile(directory);
        await setOmniMode(directory, "on");
      }
    },

    "experimental.session.compacting": async (_input, output) => {
      output.context.push(
        [
          "## OmniCode Durable State",
          await readStateSummary(directory),
        ].join("\n\n"),
      );
    },

    "tool.execute.before": async (input, output) => {
      // RTK integration: rewrite bash commands through RTK for token savings.
      // RTK handles passthrough for commands it doesn't recognize, so we
      // prefix all bash commands and let RTK decide what to compress.
      const args = (output.args ?? {}) as Record<string, unknown>;
      const commandKey = Object.keys(args).find(
        (k) => typeof args[k] === "string" && (k === "command" || k === "cmd"),
      );
      const originalBashCommand = input.tool === "bash" && commandKey ? String(args[commandKey]) : null;

      const activeMode = await readOmniMode(directory);
      if (activeMode === "off") return;

      const fileMutatingTool = input.tool === "write" || input.tool === "edit";
      const potentiallyMutatingBash = originalBashCommand ? isPotentiallyMutatingBashCommand(originalBashCommand) : false;
      if (fileMutatingTool) {
        const targetPath = extractFilePath(args);
        if (!targetPath) return;
        if (await isInsideProjectOmniDir(directory, targetPath)) {
          return;
        }
      }

      if (!fileMutatingTool && !potentiallyMutatingBash) {
        if (rtkAvailable && input.tool === "bash" && commandKey && typeof args[commandKey] === "string") {
          const originalCommand = args[commandKey] as string;
          if (!originalCommand.trimStart().startsWith("rtk ")) {
            args[commandKey] = `rtk ${originalCommand}`;
          }
        }
        return;
      }

      const hasPlanningArtifacts = await planningArtifactsReady(directory);
      if (!hasPlanningArtifacts) {
        throw new Error(
          "OmniCode guard: before editing source files or running mutating shell commands, write real planning content into .omni/SPEC.md, .omni/TASKS.md, and .omni/TESTS.md (placeholder bootstrap files are not enough).",
        );
      }

      if (rtkAvailable && input.tool === "bash" && commandKey && typeof args[commandKey] === "string") {
        const originalCommand = args[commandKey] as string;
        if (!originalCommand.trimStart().startsWith("rtk ")) {
          args[commandKey] = `rtk ${originalCommand}`;
        }
      }
    },

    tool: {
      omnicode_bootstrap: tool({
        description:
          "Create the .omni durable-memory folder and default OmniCode workflow files in the current project.",
        args: {
          mode: tool.schema.enum(["on", "off"]).optional().describe("Initial Omni mode; defaults to on."),
        },
        async execute(args) {
          await ensureOmniDir(directory);
          await initializeProjectFile(directory);
          await setOmniMode(directory, (args.mode as OmniMode | undefined) ?? "on");
          await appendSessionSummary(directory, {
            title: "Bootstrap",
            bullets: [
              "Initialized .omni durable memory for the project.",
              `Set Omni mode to ${(args.mode as OmniMode | undefined) ?? "on"}.`,
            ],
          });
          return `Bootstrapped ${path.join(directory, ".omni")}`;
        },
      }),

      omnicode_set_mode: tool({
        description: "Turn Omni mode on or off for the current project.",
        args: {
          mode: tool.schema.enum(["on", "off"]).describe("Desired Omni mode."),
        },
        async execute(args) {
          await setOmniMode(directory, args.mode as OmniMode);
          return `Omni mode set to ${args.mode}.`;
        },
      }),

      omnicode_state: tool({
        description: "Read the current OmniCode durable state summary from .omni/STATE.md.",
        args: {},
        async execute() {
          await ensureOmniDir(directory);
          return readStateSummary(directory);
        },
      }),

      omnicode_update_state: tool({
        description: "Update .omni/STATE.md with the current phase, active task, blockers, and next step.",
        args: {
          currentPhase: tool.schema.string().optional().describe("Current workflow phase."),
          activeTask: tool.schema.string().optional().describe("Current active task."),
          statusSummary: tool.schema.string().optional().describe("One-line status summary."),
          blockers: tool.schema.array(tool.schema.string()).optional().describe("Current blockers, if any."),
          nextStep: tool.schema.string().optional().describe("Most likely next step."),
        },
        async execute(args) {
          const outputPath = await updateStateFile(directory, args);
          return `Updated ${outputPath}`;
        },
      }),

      omnicode_append_session_summary: tool({
        description: "Append a concise titled update to .omni/SESSION-SUMMARY.md.",
        args: {
          title: tool.schema.string().describe("Short heading for the update."),
          bullets: tool.schema.array(tool.schema.string()).describe("Concise bullet points to append."),
        },
        async execute(args) {
          const outputPath = await appendSessionSummary(directory, args);
          return `Updated ${outputPath}`;
        },
      }),

      omnicode_repo_map: tool({
        description:
          "Generate a lightweight repo map for the current project and save it to .omni/REPO-MAP.md.",
        args: {},
        async execute() {
          return buildRepoMap(directory);
        },
      }),

      omnicode_discover_standards: tool({
        description:
          "Discover external instruction files such as AGENTS.md, CLAUDE.md, Cursor rules, and similar standards files in the current project.",
        args: {},
        async execute() {
          const candidates = await discoverStandards(directory);
          if (candidates.length === 0) {
            return "No external standards files found.";
          }
          return candidates
            .map((candidate) => `- ${candidate.path} (${candidate.kind})`)
            .join("\n");
        },
      }),

      omnicode_import_standards: tool({
        description:
          "Import discovered external standards into .omni/STANDARDS.md. Optionally limit the import to selected relative paths.",
        args: {
          paths: tool.schema
            .array(tool.schema.string())
            .optional()
            .describe("Optional list of relative file paths to import. When omitted, import all discovered standards."),
        },
        async execute(args) {
          const result = await importStandards(directory, args.paths);
          if (result.imported.length === 0) {
            return `No standards imported. Wrote ${result.outputPath}.`;
          }
          return [
            `Imported ${result.imported.length} standards into ${result.outputPath}:`,
            ...result.imported.map((candidate) => `- ${candidate.path} (${candidate.kind})`),
          ].join("\n");
        },
      }),

      omnicode_suggest_skills: tool({
        description:
          "Suggest bundled OmniCode skills based on the current task or request text.",
        args: {
          task: tool.schema.string().describe("Task, request, or work summary to analyze."),
        },
        async execute(args) {
          const suggestions = await suggestSkills(args.task);
          if (suggestions.length === 0) {
            return "No specific bundled skills inferred from the task.";
          }
          return suggestions
            .map((skill) => `- ${skill.name} [${skill.score}]: ${skill.reason}`)
            .join("\n");
        },
      }),

      omnicode_update_skills: tool({
        description:
          "Update .omni/SKILLS.md with bundled skills and suggestions for the current work.",
        args: {
          task: tool.schema.string().describe("Task, request, or work summary to analyze."),
        },
        async execute(args) {
          const result = await updateSkillsFile(directory, args.task);
          if (result.suggested.length === 0) {
            return `Updated ${result.outputPath} with no additional suggested skills.`;
          }
          return [
            `Updated ${result.outputPath} with suggested skills:`,
            ...result.suggested.map((skill) => `- ${skill.name} [${skill.score}]: ${skill.reason}`),
          ].join("\n");
        },
      }),

      omnicode_list_skills: tool({
        description: "List bundled OmniCode workflow skills available to the agent.",
        args: {},
        async execute() {
          const skills = await listSkills();
          return skills
            .map((skill) => `- ${skill.name}: ${skill.description}`)
            .join("\n");
        },
      }),

      omnicode_read_skill: tool({
        description: "Read a bundled OmniCode skill by name.",
        args: {
          name: tool.schema.string().describe("Skill name without .md extension."),
        },
        async execute(args) {
          return readSkill(args.name);
        },
      }),
    },
  };
};

export default OmniCodePlugin;
