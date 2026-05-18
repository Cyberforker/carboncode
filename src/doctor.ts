import type { DeepSeekClient, ModelList } from "./client.js";
import { MODEL_PROFILES } from "./models.js";

export interface DoctorResult {
  ok: boolean;
  lines: string[];
}

export async function runDoctor(opts: { client: Pick<DeepSeekClient, "listModels"> }): Promise<DoctorResult> {
  const lines: string[] = [];
  try {
    const models: ModelList = await opts.client.listModels();
    const ids = new Set(models.data.map((model) => model.id));
    lines.push("DeepSeek API 连接正常。");
    for (const profile of Object.values(MODEL_PROFILES)) {
      const marker = ids.has(profile.model) ? "✓" : "!";
      lines.push(`${marker} ${profile.name}: ${profile.model}`);
    }
    return { ok: true, lines };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      lines: [`DeepSeek API 检查失败: ${message}`],
    };
  }
}
