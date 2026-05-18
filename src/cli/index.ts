#!/usr/bin/env node
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { Command } from "commander";
import { AgentRunner } from "../agent.js";
import { DeepSeekClient } from "../client.js";
import {
  defaultConfigPath,
  loadApiKey,
  loadBaseUrl,
  readConfig,
  saveSetup,
} from "../config.js";
import { runDoctor } from "../doctor.js";
import { loadDotenv } from "../env.js";
import { runInteractiveSession } from "../interactive.js";
import { MODEL_PROFILES, resolveModelProfile } from "../models.js";
import { SessionStore, defaultSessionDir } from "../session.js";
import { VERSION } from "../version.js";

export function buildProgram(): Command {
  const program = new Command();
  program
    .name("carboncode")
    .description("Carbon Code：中文优先的 DeepSeek 终端代码智能体")
    .version(VERSION);

  program
    .command("setup")
    .description("保存 DeepSeek API 配置到 ~/.carboncode/config.json")
    .option("--api-key <key>", "DeepSeek API key")
    .option("--base-url <url>", "DeepSeek API base URL")
    .option("--profile <name>", "默认模型 profile: auto|flash|pro", "flash")
    .action(async (opts: { apiKey?: string; baseUrl?: string; profile: string }) => {
      const apiKey = opts.apiKey ?? (await askSecret("请输入 DeepSeek API Key: "));
      const cfg = saveSetup({
        apiKey,
        baseUrl: opts.baseUrl,
        profile: resolveModelProfile(opts.profile).name,
      });
      output.write(`配置已保存到 ${defaultConfigPath()}\n`);
      output.write(`默认模型: ${resolveModelProfile(cfg.profile).model}\n`);
    });

  program
    .command("models")
    .description("列出 Carbon Code 内置 DeepSeek 模型 profile")
    .action(() => {
      for (const profile of Object.values(MODEL_PROFILES)) {
        output.write(`${profile.name}\t${profile.model}\t${profile.label}\n`);
      }
    });

  program
    .command("doctor")
    .description("检查本机配置和 DeepSeek API 连通性")
    .action(async () => {
      loadDotenv();
      const apiKey = loadApiKey();
      if (!apiKey) {
        throw new Error("未找到 DEEPSEEK_API_KEY。请设置环境变量或运行 carboncode setup。");
      }
      const result = await runDoctor({
        client: new DeepSeekClient({ apiKey, baseUrl: loadBaseUrl(), timeoutMs: 30_000 }),
      });
      output.write(`${result.lines.join("\n")}\n`);
      if (!result.ok) process.exitCode = 1;
    });

  program
    .command("run <task>")
    .description("非交互执行一个代码任务")
    .option("-m, --model <profile>", "模型 profile: auto|flash|pro")
    .option("-s, --session <name>", "会话名称", "default")
    .option("-r, --resume", "恢复同名会话")
    .option("-y, --yes", "自动批准文件编辑和 shell 命令")
    .action(
      async (
        task: string,
        opts: { model?: string; session: string; resume?: boolean; yes?: boolean },
      ) => {
        loadDotenv();
        const cfg = readConfig();
        const apiKey = loadApiKey();
        if (!apiKey) {
          throw new Error("未找到 DEEPSEEK_API_KEY。请设置环境变量或运行 carboncode setup。");
        }
        const client = new DeepSeekClient({ apiKey, baseUrl: loadBaseUrl() });
        const store = new SessionStore(defaultSessionDir());
        const runner = new AgentRunner({
          rootDir: process.cwd(),
          client,
          profile: opts.model ?? cfg.profile,
          initialMessages: opts.resume ? store.load(opts.session) : [],
          approve: opts.yes ? async () => true : approveInteractively,
        });
        const result = await runner.run(task);
        store.save(opts.session, result.messages);
        if (result.changedFiles.length > 0) {
          output.write(`变更文件: ${result.changedFiles.join(", ")}\n`);
        }
        output.write(`${result.summary}\n`);
        output.write(`Tokens: ${result.totalTokens}\n`);
        if (result.costUsd !== undefined) {
          output.write(`费用估算: $${result.costUsd.toFixed(6)}\n`);
        }
      },
    );

  program.action(async () => {
    loadDotenv();
    const cfg = readConfig();
    const apiKey = loadApiKey();
    if (!apiKey) {
      output.write("未找到 DEEPSEEK_API_KEY。请先运行 carboncode setup。\n");
      return;
    }
    const store = new SessionStore(defaultSessionDir());
    const rl = createInterface({ input, output });
    try {
      await runInteractiveSession({
        sessionName: cfg.session ?? "default",
        io: {
          write: (line) => output.write(`${line}\n`),
          question: (prompt) => rl.question(prompt),
        },
        loadMessages: (name) => store.load(name),
        saveMessages: (name, messages) => store.save(name, messages),
        createRunner: (initialMessages) =>
          new AgentRunner({
            rootDir: process.cwd(),
            client: new DeepSeekClient({ apiKey, baseUrl: loadBaseUrl() }),
            profile: cfg.profile,
            initialMessages,
            approve: approveInteractively,
          }),
      });
    } finally {
      rl.close();
    }
  });

  return program;
}

export async function main(argv = process.argv): Promise<void> {
  await buildProgram().parseAsync(argv);
}

async function approveInteractively(request: { type: string; command?: string; path?: string }) {
  const subject = request.command ?? request.path ?? request.type;
  const rl = createInterface({ input, output });
  try {
    const answer = await rl.question(`批准 ${request.type} ${subject}? [y/N] `);
    return /^y(es)?$/i.test(answer.trim());
  } finally {
    rl.close();
  }
}

async function askSecret(question: string): Promise<string> {
  const rl = createInterface({ input, output });
  try {
    const answer = await rl.question(question);
    return answer.trim();
  } finally {
    rl.close();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
