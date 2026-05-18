import { chmodSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import type { ModelProfileName } from "./models.js";

export interface CarbonConfig {
  apiKey?: string;
  baseUrl?: string;
  profile?: ModelProfileName;
  session?: string | null;
  setupCompleted?: boolean;
}

export function defaultConfigPath(home = homedir()): string {
  return join(home, ".carboncode", "config.json");
}

export function readConfig(path = defaultConfigPath()): CarbonConfig {
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8"));
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as CarbonConfig;
    }
  } catch {
    return {};
  }
  return {};
}

export function writeConfig(cfg: CarbonConfig, path = defaultConfigPath()): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(cfg, null, 2), "utf8");
  try {
    chmodSync(path, 0o600);
  } catch {
    // Windows and some mounted filesystems may not support chmod.
  }
}

export function loadApiKey(path = defaultConfigPath()): string | undefined {
  const envKey = process.env.DEEPSEEK_API_KEY?.trim();
  if (envKey) return envKey;
  const cfgKey = readConfig(path).apiKey?.trim();
  return cfgKey || undefined;
}

export function loadBaseUrl(path = defaultConfigPath()): string | undefined {
  const envUrl = process.env.DEEPSEEK_BASE_URL?.trim();
  if (envUrl) return envUrl;
  const cfgUrl = readConfig(path).baseUrl?.trim();
  return cfgUrl || undefined;
}

export function saveSetup(
  input: Pick<CarbonConfig, "apiKey" | "baseUrl" | "profile">,
  path = defaultConfigPath(),
): CarbonConfig {
  const next: CarbonConfig = {
    ...readConfig(path),
    ...input,
    setupCompleted: true,
  };
  writeConfig(next, path);
  return next;
}
