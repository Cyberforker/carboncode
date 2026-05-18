export interface ApprovalPromptRequest {
  type: string;
  command?: string;
  destructive?: boolean;
  network?: boolean;
  reason?: string;
  path?: string;
  preview?: string;
}

export function formatApprovalRequest(request: ApprovalPromptRequest): string {
  if (request.type === "edit") {
    return [
      `准备编辑 ${request.path ?? "(unknown)"}`,
      request.preview ? `\n${request.preview}` : "",
      "\n批准这次编辑？[y/N] ",
    ].join("\n");
  }

  if (request.type === "shell") {
    const badges = [
      request.destructive ? "破坏性" : "",
      request.network ? "联网" : "",
      request.reason ?? "",
    ].filter(Boolean);
    const suffix = request.destructive ? "输入 yes 才会执行: " : "批准执行？[y/N] ";
    return [`准备执行命令: ${request.command ?? ""}`, badges.length ? `风险: ${badges.join(" · ")}` : "", suffix]
      .filter(Boolean)
      .join("\n");
  }

  return `批准 ${request.type}？[y/N] `;
}

export function isApprovalAccepted(
  answer: string,
  request: Pick<ApprovalPromptRequest, "destructive">,
): boolean {
  const normalized = answer.trim().toLowerCase();
  if (request.destructive) return normalized === "yes";
  return normalized === "y" || normalized === "yes";
}
