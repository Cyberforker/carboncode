import { promises as fs } from "node:fs";
import { join } from "node:path";

export interface ProjectRule {
  path: "CARBON.md" | "AGENTS.md";
  content: string;
}

export async function loadProjectRules(rootDir: string): Promise<ProjectRule[]> {
  const out: ProjectRule[] = [];
  for (const name of ["CARBON.md", "AGENTS.md"] as const) {
    try {
      out.push({ path: name, content: await fs.readFile(join(rootDir, name), "utf8") });
    } catch {
      // Rule files are optional.
    }
  }
  return out;
}

export function renderRulesForPrompt(rules: readonly ProjectRule[]): string {
  if (rules.length === 0) return "";
  return rules.map((rule) => `# ${rule.path}\n${rule.content}`).join("\n\n");
}
