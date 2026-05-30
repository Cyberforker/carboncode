import { defaultConfigPath, loadResolvedSkillPaths } from "@/config.js";
import { t } from "@/i18n/index.js";
import { type Skill, SkillStore } from "@/skills.js";
import type { SlashHandler } from "../dispatch.js";

/** "deepseek-v4-pro" → "pro"; undefined → "default". */
function shortModel(model: string | undefined): string {
  if (!model) return "default";
  if (model.endsWith("pro")) return "pro";
  if (model.endsWith("flash")) return "flash";
  return model;
}

function agentRow(s: Skill): string {
  const scope = `(${s.scope})`.padEnd(11);
  const name = s.name.padEnd(20);
  const model = shortModel(s.model).padEnd(8);
  const tools = (s.allowedTools?.length ? s.allowedTools.join(",") : "inherits").padEnd(16);
  const desc = s.description.length > 60 ? `${s.description.slice(0, 59)}…` : s.description;
  return `  ${scope} ${name} ${model} ${tools} ${desc}`;
}

const agents: SlashHandler = (args, _loop, ctx) => {
  const baseDir = ctx.codeRoot ?? process.cwd();
  const configPath = ctx.configPath ?? defaultConfigPath();
  const store = new SkillStore({
    projectRoot: ctx.codeRoot,
    customSkillPaths: loadResolvedSkillPaths(baseDir, configPath),
  });
  const sub = (args[0] ?? "").toLowerCase();

  if (sub === "new" || sub === "init") {
    const name = args[1];
    if (!name) return { info: t("handlers.agents.newUsage") };
    const wantsGlobal = args.slice(2).includes("--global") || !ctx.codeRoot;
    const result = store.createAgent(name, wantsGlobal ? "global" : "project");
    if ("error" in result) {
      return { info: t("handlers.agents.newError", { reason: result.error }) };
    }
    return { info: t("handlers.agents.newCreated", { name, path: result.path }) };
  }

  if (sub === "show" || sub === "cat") {
    const target = args[1];
    if (!target) return { info: t("handlers.agents.showUsage") };
    const found = store.readAgent(target);
    if (!found) {
      return { info: t("handlers.agents.showNotFound", { name: target }) };
    }
    return {
      info: [
        `▸ ${found.name}  (${found.scope})  model=${shortModel(found.model)}`,
        found.description ? `  ${found.description}` : "",
        `  ${found.path}`,
        "",
        found.body,
      ]
        .filter((l) => l !== "")
        .join("\n"),
    };
  }

  // bare / list
  const list = store.listAgents();
  const lines = [t("handlers.agents.listHeader", { count: list.length })];
  for (const s of list) lines.push(agentRow(s));
  lines.push(
    "",
    t("handlers.agents.listAddHint"),
    t("handlers.agents.listInvokeHint"),
    t("handlers.agents.listNewHint"),
  );
  return { info: lines.join("\n") };
};

export const handlers: Record<string, SlashHandler> = {
  agents,
  agent: agents,
};
