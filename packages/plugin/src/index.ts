import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

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

export type StandardCandidate = {
  path: string;
  kind: string;
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

export const OMNI_FILES: Record<string, string> = {
  "PROJECT.md": "# Project\n\n## Goal\n\nDocument the project goal here.\n",
  "SPEC.md": "# Spec\n\nDescribe the requested behavior precisely before implementation.\n",
  "TASKS.md": "# Tasks\n\nBreak work into bounded, verifiable slices before editing source files.\n",
  "TESTS.md": "# Tests\n\nList checks to run after each implementation slice.\n",
  "STATE.md": "# State\n\nCurrent Phase: discovery\nActive Task: \nStatus Summary: OmniCode workspace bootstrapped.\nBlockers: None\nNext Step: Clarify scope, write spec, and break work into tasks before implementation.\n",
  "DECISIONS.md": "# Decisions\n\nRecord important choices and why they were made.\n",
  "STANDARDS.md": "# Imported Standards\n\nRecord imported standards from AGENTS.md, CLAUDE.md, Cursor rules, and similar files.\n",
  "SKILLS.md": "# Skills\n\n## Bundled\n\n- brainstorming\n- omni-planning\n- omni-execution\n- omni-verification\n\nRecord required and project-specific skills here.\n",
  "SESSION-SUMMARY.md": "# Session Summary\n\nSummarize progress and remaining work across sessions.\n",
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
      await writeFile(filePath, content, "utf8");
    }
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

async function setOmniMode(directory: string, mode: OmniMode): Promise<void> {
  const omniDir = await ensureOmniDir(directory);
  await writeFile(
    path.join(omniDir, "CONFIG.md"),
    `# Omni Configuration\n\nOmni Mode: ${mode}\n`,
    "utf8",
  );
}

async function readStateSummary(directory: string): Promise<string> {
  try {
    return await readFile(path.join(directory, ".omni", "STATE.md"), "utf8");
  } catch {
    return "No .omni/STATE.md found.";
  }
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

async function readSkill(name: string): Promise<string> {
  const filePath = await resolveResourcePath("skills", `${name}.md`);
  return readFile(filePath, "utf8");
}

async function buildRepoMap(directory: string): Promise<string> {
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
  const lines: string[] = [];

  async function walk(currentDir: string, depth: number): Promise<void> {
    if (depth > 3) return;
    const entries = await readdir(currentDir, { withFileTypes: true });
    const sorted = entries
      .filter((entry) => !ignore.has(entry.name))
      .sort((a, b) => Number(b.isDirectory()) - Number(a.isDirectory()) || a.name.localeCompare(b.name));

    for (const entry of sorted) {
      const fullPath = path.join(currentDir, entry.name);
      const relativePath = path.relative(directory, fullPath) || ".";
      if (entry.isDirectory()) {
        lines.push(`${"  ".repeat(depth)}- ${relativePath}/`);
        await walk(fullPath, depth + 1);
        continue;
      }

      if (/\.(ts|tsx|js|jsx|json|md|sh|yml|yaml)$/u.test(entry.name)) {
        lines.push(`${"  ".repeat(depth)}- ${relativePath}`);
      }
    }
  }

  await walk(directory, 0);
  const summary = [
    "# Repo Map",
    "",
    `Root: ${directory}`,
    "",
    ...lines.slice(0, 250),
  ].join("\n");

  const omniDir = await ensureOmniDir(directory);
  await writeFile(path.join(omniDir, "REPO-MAP.md"), `${summary}\n`, "utf8");
  return summary;
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

  const sections: string[] = ["# Imported Standards", ""];

  if (imported.length === 0) {
    sections.push("No external standards were discovered.");
  } else {
    sections.push(
      "These standards were discovered from common agent-instruction locations and imported into OmniCode durable memory.",
      "",
    );

    for (const candidate of imported) {
      const content = await readFile(path.join(directory, candidate.path), "utf8");
      sections.push(
        `## ${candidate.kind}: ${candidate.path}`,
        "",
        "```md",
        content.replace(/```/gu, "\\`\\`\\`"),
        "```",
        "",
      );
    }
  }

  const outputPath = path.join(omniDir, "STANDARDS.md");
  await writeFile(outputPath, `${sections.join("\n").trimEnd()}\n`, "utf8");
  return { imported, outputPath };
}

async function readInstructionPrompt(): Promise<string> {
  const instructionFile = await resolveResourcePath(
    "instructions",
    "omnicode-agent.md",
  );
  return readFile(instructionFile, "utf8");
}

export async function planningArtifactsReady(directory: string): Promise<boolean> {
  const specPath = path.join(directory, ".omni", "SPEC.md");
  const tasksPath = path.join(directory, ".omni", "TASKS.md");

  try {
    const [specContent, tasksContent] = await Promise.all([
      readFile(specPath, "utf8"),
      readFile(tasksPath, "utf8"),
    ]);

    const normalizedSpec = specContent.trim();
    const normalizedTasks = tasksContent.trim();
    const defaultSpec = OMNI_FILES["SPEC.md"].trim();
    const defaultTasks = OMNI_FILES["TASKS.md"].trim();

    return (
      normalizedSpec.length > defaultSpec.length &&
      normalizedTasks.length > defaultTasks.length &&
      normalizedSpec !== defaultSpec &&
      normalizedTasks !== defaultTasks
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

export const OmniCodePlugin: Plugin = async ({ directory }) => {
  const commands = await loadCommands();
  const instructionPrompt = await readInstructionPrompt();

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
      const activeMode = await readOmniMode(directory);
      if (activeMode === "off") return;

      const fileMutatingTool = input.tool === "write" || input.tool === "edit";
      if (!fileMutatingTool) return;

      const args = (output.args ?? {}) as Record<string, unknown>;
      const targetPath = extractFilePath(args);
      if (!targetPath) return;
      if (targetPath.includes(`${path.sep}.omni${path.sep}`) || targetPath.startsWith(".omni/")) {
        return;
      }

      const hasPlanningArtifacts = await planningArtifactsReady(directory);
      if (!hasPlanningArtifacts) {
        throw new Error(
          "OmniCode guard: before editing source files, write real planning content into .omni/SPEC.md and .omni/TASKS.md (placeholder bootstrap files are not enough).",
        );
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
          await setOmniMode(directory, (args.mode as OmniMode | undefined) ?? "on");
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
