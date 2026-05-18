import { promises as fs } from "node:fs";
import * as path from "node:path";

export interface ApprovalRequest {
  type: "edit" | "shell";
  command?: string;
  destructive?: boolean;
  network?: boolean;
  reason?: string;
  path?: string;
  preview?: string;
}

export type Approve = (request: ApprovalRequest) => Promise<boolean> | boolean;

interface IgnoreRule {
  pattern: string;
  directoryOnly: boolean;
}

const DEFAULT_SKIP_DIRS = new Set([
  ".git",
  ".hg",
  ".svn",
  ".worktrees",
  "node_modules",
  "dist",
  "build",
  "coverage",
]);

const BINARY_EXTS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".pdf",
  ".zip",
  ".gz",
  ".tar",
  ".tgz",
  ".wasm",
  ".woff",
  ".woff2",
]);

function toDisplayRel(rootDir: string, full: string): string {
  return path.relative(rootDir, full).replaceAll("\\", "/") || ".";
}

function resolveInside(rootDir: string, userPath: string): string {
  const root = path.resolve(rootDir);
  const full = path.resolve(root, userPath);
  const rel = path.relative(root, full);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error(`路径越界: ${userPath}`);
  }
  return full;
}

function isBinaryByName(name: string): boolean {
  return BINARY_EXTS.has(path.extname(name).toLowerCase());
}

async function walkFiles(
  rootDir: string,
  visitor: (full: string, rel: string) => Promise<void>,
  includeDeps = false,
  ignoreRules: readonly IgnoreRule[] = [],
): Promise<void> {
  async function walk(dir: string): Promise<void> {
    let entries: import("node:fs").Dirent[];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      const rel = toDisplayRel(rootDir, full);
      if (isIgnored(rel, entry.isDirectory(), ignoreRules)) continue;
      if (entry.isDirectory()) {
        if (!includeDeps && DEFAULT_SKIP_DIRS.has(entry.name)) continue;
        await walk(full);
      } else if (entry.isFile()) {
        await visitor(full, rel);
      }
    }
  }
  await walk(rootDir);
}

export async function listFiles(
  rootDir: string,
  opts: { includeDeps?: boolean; maxBytes?: number } = {},
): Promise<string> {
  const ignoreRules = await loadSimpleGitignore(rootDir);
  const files: string[] = [];
  let bytes = 0;
  const maxBytes = opts.maxBytes ?? 32_000;
  await walkFiles(
    rootDir,
    async (_full, rel) => {
      if (bytes + rel.length + 1 > maxBytes) {
        files.push("[... file list truncated ...]");
        return;
      }
      files.push(rel);
      bytes += rel.length + 1;
    },
    opts.includeDeps,
    ignoreRules,
  );
  return files.length ? files.join("\n") : "(no files)";
}

export async function searchFiles(
  rootDir: string,
  pattern: string,
  opts: { includeDeps?: boolean; maxBytes?: number } = {},
): Promise<string> {
  const needle = pattern.toLowerCase();
  let re: RegExp | null = null;
  try {
    re = new RegExp(pattern, "i");
  } catch {
    re = null;
  }
  const matches: string[] = [];
  let bytes = 0;
  const maxBytes = opts.maxBytes ?? 32_000;
  const ignoreRules = await loadSimpleGitignore(rootDir);
  await walkFiles(
    rootDir,
    async (_full, rel) => {
      const name = path.basename(rel);
      const hit = re ? re.test(name) || re.test(rel) : rel.toLowerCase().includes(needle);
      if (!hit) return;
      if (bytes + rel.length + 1 > maxBytes) {
        matches.push("[... search truncated ...]");
        return;
      }
      matches.push(rel);
      bytes += rel.length + 1;
    },
    opts.includeDeps,
    ignoreRules,
  );
  return matches.length ? matches.join("\n") : "(no matches)";
}

export async function searchContent(
  rootDir: string,
  pattern: string,
  opts: { includeDeps?: boolean; maxBytes?: number; caseSensitive?: boolean } = {},
): Promise<string> {
  const caseSensitive = opts.caseSensitive === true;
  const needle = caseSensitive ? pattern : pattern.toLowerCase();
  let re: RegExp | null = null;
  try {
    re = new RegExp(pattern, caseSensitive ? "" : "i");
  } catch {
    re = null;
  }
  const matches: string[] = [];
  let bytes = 0;
  const maxBytes = opts.maxBytes ?? 64_000;
  const ignoreRules = await loadSimpleGitignore(rootDir);
  await walkFiles(
    rootDir,
    async (full, rel) => {
      if (isBinaryByName(full)) return;
      let raw: Buffer;
      try {
        const stat = await fs.stat(full);
        if (stat.size > 2 * 1024 * 1024) return;
        raw = await fs.readFile(full);
      } catch {
        return;
      }
      if (raw.indexOf(0) !== -1) return;
      const lines = raw.toString("utf8").split(/\r?\n/);
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i] ?? "";
        const haystack = caseSensitive ? line : line.toLowerCase();
        const hit = re ? re.test(line) : haystack.includes(needle);
        if (!hit) continue;
        const preview = line.length > 200 ? `${line.slice(0, 200)}...` : line;
        const out = `${rel}:${i + 1}: ${preview}`;
        if (bytes + out.length + 1 > maxBytes) {
          matches.push("[... truncated; refine pattern ...]");
          return;
        }
        matches.push(out);
        bytes += out.length + 1;
      }
    },
    opts.includeDeps,
    ignoreRules,
  );
  return matches.length ? matches.join("\n") : "(no matches)";
}

export async function readProjectFile(
  rootDir: string,
  userPath: string,
  opts: { maxBytes?: number } = {},
): Promise<string> {
  const full = resolveInside(rootDir, userPath);
  const raw = await fs.readFile(full);
  if (opts.maxBytes !== undefined && raw.length > opts.maxBytes) {
    return `${raw.subarray(0, opts.maxBytes).toString("utf8")}\n[... truncated at ${opts.maxBytes} bytes; file has ${raw.length} bytes ...]`;
  }
  return raw.toString("utf8");
}

export async function applyEdit(
  rootDir: string,
  abs: string,
  args: { search: string; replace: string },
): Promise<string> {
  const preview = await previewEdit(rootDir, abs, args);
  const before = await fs.readFile(abs, "utf8");
  const lineEnding = before.includes("\r\n") ? "\r\n" : "\n";
  const search = args.search.replace(/\r?\n/g, lineEnding);
  const replace = args.replace.replace(/\r?\n/g, lineEnding);
  const firstIdx = before.indexOf(search);
  const after = before.slice(0, firstIdx) + replace + before.slice(firstIdx + search.length);
  await fs.writeFile(abs, after, "utf8");
  return preview;
}

export async function previewEdit(
  rootDir: string,
  abs: string,
  args: { search: string; replace: string },
): Promise<string> {
  if (!args.search) throw new Error("edit_file: search cannot be empty");
  const before = await fs.readFile(abs, "utf8");
  const lineEnding = before.includes("\r\n") ? "\r\n" : "\n";
  const search = args.search.replace(/\r?\n/g, lineEnding);
  const replace = args.replace.replace(/\r?\n/g, lineEnding);
  const firstIdx = before.indexOf(search);
  if (firstIdx < 0) {
    throw new Error(`edit_file: search text not found in ${toDisplayRel(rootDir, abs)}`);
  }
  const nextIdx = before.indexOf(search, firstIdx + 1);
  if (nextIdx >= 0) {
    throw new Error(
      `edit_file: search text appears multiple times in ${toDisplayRel(rootDir, abs)} — include more context to disambiguate`,
    );
  }
  const startLine = before.slice(0, firstIdx).split(/\r?\n/).length;
  return `edited ${toDisplayRel(rootDir, abs)} (${search.length}->${replace.length} chars)\n${renderEditDiff(
    search,
    replace,
    startLine,
  )}`;
}

export function createWorkspaceTools(
  rootDir: string,
  opts: { approve: Approve },
): {
  listFiles(args?: { includeDeps?: boolean }): Promise<string>;
  readFile(args: { path: string }): Promise<string>;
  searchFiles(args: { pattern: string; includeDeps?: boolean }): Promise<string>;
  searchContent(args: { pattern: string; includeDeps?: boolean }): Promise<string>;
  editFile(args: { path: string; search: string; replace: string }): Promise<string>;
} {
  return {
    listFiles: async (args = {}) => listFiles(rootDir, { includeDeps: args.includeDeps }),
    readFile: async (args) => readProjectFile(rootDir, args.path, { maxBytes: 64_000 }),
    searchFiles: async (args) => searchFiles(rootDir, args.pattern, { includeDeps: args.includeDeps }),
    searchContent: async (args) =>
      searchContent(rootDir, args.pattern, { includeDeps: args.includeDeps }),
    editFile: async (args) => {
      const abs = resolveInside(rootDir, args.path);
      const preview = await previewEdit(rootDir, abs, args);
      const approved = await opts.approve({
        type: "edit",
        path: args.path,
        preview,
      });
      if (!approved) return `用户未批准编辑: ${args.path}`;
      return applyEdit(rootDir, abs, args);
    },
  };
}

async function loadSimpleGitignore(rootDir: string): Promise<IgnoreRule[]> {
  let raw = "";
  try {
    raw = await fs.readFile(path.join(rootDir, ".gitignore"), "utf8");
  } catch {
    return [];
  }
  const rules: IgnoreRule[] = [];
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("!")) continue;
    const directoryOnly = trimmed.endsWith("/");
    const pattern = trimmed.replace(/^\/+/, "").replace(/\/+$/, "");
    if (pattern) rules.push({ pattern, directoryOnly });
  }
  return rules;
}

function isIgnored(rel: string, isDir: boolean, rules: readonly IgnoreRule[]): boolean {
  for (const rule of rules) {
    if (rule.directoryOnly && !isDir && !rel.startsWith(`${rule.pattern}/`)) continue;
    if (rule.pattern.includes("/")) {
      if (rel === rule.pattern || rel.startsWith(`${rule.pattern}/`)) return true;
      continue;
    }
    const parts = rel.split("/");
    if (parts.includes(rule.pattern)) return true;
  }
  return false;
}

function renderEditDiff(search: string, replace: string, startLine: number): string {
  const before = search.split(/\r?\n/);
  const after = replace.split(/\r?\n/);
  const body = lineDiff(before, after).map((entry) => `${entry.op} ${entry.line}`).join("\n");
  return `@@ -${startLine},${before.length} +${startLine},${after.length} @@\n${body}`;
}

export function lineDiff(
  before: readonly string[],
  after: readonly string[],
): Array<{ op: "-" | "+" | " "; line: string }> {
  const dp: number[][] = Array.from({ length: before.length + 1 }, () =>
    new Array(after.length + 1).fill(0),
  );
  for (let i = 1; i <= before.length; i++) {
    for (let j = 1; j <= after.length; j++) {
      dp[i]![j] =
        before[i - 1] === after[j - 1]
          ? dp[i - 1]![j - 1]! + 1
          : Math.max(dp[i - 1]![j]!, dp[i]![j - 1]!);
    }
  }
  const out: Array<{ op: "-" | "+" | " "; line: string }> = [];
  let i = before.length;
  let j = after.length;
  while (i > 0 && j > 0) {
    if (before[i - 1] === after[j - 1]) {
      out.unshift({ op: " ", line: before[i - 1]! });
      i--;
      j--;
    } else if (dp[i - 1]![j]! > dp[i]![j - 1]!) {
      out.unshift({ op: "-", line: before[i - 1]! });
      i--;
    } else {
      out.unshift({ op: "+", line: after[j - 1]! });
      j--;
    }
  }
  while (i > 0) {
    out.unshift({ op: "-", line: before[i - 1]! });
    i--;
  }
  while (j > 0) {
    out.unshift({ op: "+", line: after[j - 1]! });
    j--;
  }
  return out;
}
