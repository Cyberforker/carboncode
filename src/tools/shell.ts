import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

export interface ShellApprovalRequest {
  type: "shell";
  command: string;
  destructive: boolean;
  network: boolean;
  reason?: string;
}

export interface ShellResult {
  approved: boolean;
  exitCode: number | null;
  stdout: string;
  stderr: string;
}

export async function runApprovedShellCommand(
  command: string,
  opts: {
    cwd: string;
    approve: (request: ShellApprovalRequest) => Promise<boolean> | boolean;
    timeoutMs?: number;
  },
): Promise<ShellResult> {
  const classification = classifyShellCommand(command);
  const approved = await opts.approve({ type: "shell", command, ...classification });
  if (!approved) {
    return {
      approved: false,
      exitCode: null,
      stdout: "",
      stderr: `用户未批准执行命令: ${command}`,
    };
  }

  try {
    const result = await execAsync(command, {
      cwd: opts.cwd,
      timeout: opts.timeoutMs ?? 120_000,
      maxBuffer: 10 * 1024 * 1024,
    });
    return { approved: true, exitCode: 0, stdout: result.stdout, stderr: result.stderr };
  } catch (error) {
    const err = error as Error & { code?: number; stdout?: string; stderr?: string };
    return {
      approved: true,
      exitCode: typeof err.code === "number" ? err.code : 1,
      stdout: err.stdout ?? "",
      stderr: err.stderr ?? err.message,
    };
  }
}

export function classifyShellCommand(command: string): {
  destructive: boolean;
  network: boolean;
  reason?: string;
} {
  const destructive = /\b(rm\s+-rf|git\s+reset\s+--hard|git\s+clean\s+-fd|mkfs|shutdown|reboot)\b/.test(
    command,
  );
  const network =
    /\b(curl|wget|ssh|scp|rsync|git\s+clone|git\s+pull|git\s+push|npm\s+(install|i|add)|pnpm\s+(install|add)|yarn\s+(install|add)|pip\s+install|brew\s+install|gh\s+)\b/.test(
      command,
    );
  const reasons: string[] = [];
  if (destructive) reasons.push("可能删除、重置或破坏工作区");
  if (network) reasons.push("可能访问网络或修改外部依赖");
  return {
    destructive,
    network,
    reason: reasons.length ? reasons.join("；") : undefined,
  };
}
