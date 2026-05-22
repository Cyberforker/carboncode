import type { ReasonixConfig } from "../config.js";
import { t } from "../i18n/index.js";
import {
  type InstallSource,
  VERSION,
  compareVersions,
  detectInstallSource,
  getLatestVersion,
} from "../version.js";

const PACKAGE_MANAGER_SOURCES = new Set<InstallSource>(["npm", "bun", "pnpm", "yarn"]);

export interface StartupUpdateCheckGate {
  config: Pick<ReasonixConfig, "updateCheck">;
  env: Partial<Record<"CARBONCODE_NO_UPDATE_CHECK" | "CI", string>>;
  installSource: InstallSource;
  stdoutIsTTY: boolean;
}

export interface StartupUpdateHintOptions extends StartupUpdateCheckGate {
  current?: string;
  fetchLatest?: () => Promise<string | null>;
}

export interface CreateStartupUpdateCheckOptions {
  current?: string;
  env?: NodeJS.ProcessEnv;
  fetchLatest?: () => Promise<string | null>;
  installSource?: InstallSource;
  stdoutIsTTY?: boolean;
}

function envFlagEnabled(value: string | undefined): boolean {
  if (value === undefined) return false;
  const normalized = value.trim().toLowerCase();
  return normalized !== "" && normalized !== "0" && normalized !== "false";
}

export function shouldRunStartupUpdateCheck(input: StartupUpdateCheckGate): boolean {
  if (input.config.updateCheck === false) return false;
  if (!input.stdoutIsTTY) return false;
  if (envFlagEnabled(input.env.CARBONCODE_NO_UPDATE_CHECK)) return false;
  if (envFlagEnabled(input.env.CI)) return false;
  return PACKAGE_MANAGER_SOURCES.has(input.installSource);
}

export async function getStartupUpdateHint(opts: StartupUpdateHintOptions): Promise<string | null> {
  if (!shouldRunStartupUpdateCheck(opts)) return null;

  const current = opts.current ?? VERSION;
  const latest = await (opts.fetchLatest ?? (() => getLatestVersion()))();
  if (!latest) return null;
  if (compareVersions(current, latest) >= 0) return null;

  return t("startup.updateAvailable", { current, latest });
}

export function createStartupUpdateCheck(
  config: ReasonixConfig,
  opts: CreateStartupUpdateCheckOptions = {},
): (() => Promise<string | null>) | undefined {
  const env = opts.env ?? process.env;
  const installSource = opts.installSource ?? detectInstallSource();
  const stdoutIsTTY = opts.stdoutIsTTY ?? process.stdout.isTTY === true;
  const gate = { config, env, installSource, stdoutIsTTY };
  if (!shouldRunStartupUpdateCheck(gate)) return undefined;

  return () =>
    getStartupUpdateHint({
      ...gate,
      current: opts.current,
      fetchLatest: opts.fetchLatest,
    });
}
