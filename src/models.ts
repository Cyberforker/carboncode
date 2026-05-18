export type ModelProfileName = "auto" | "flash" | "pro" | "fast" | "smart" | "max";

export interface ModelProfile {
  name: "flash" | "pro";
  model: "deepseek-v4-flash" | "deepseek-v4-pro";
  label: string;
  thinking: "disabled" | "enabled";
  reasoningEffort?: "high" | "max";
}

export const MODEL_PROFILES = {
  flash: {
    name: "flash",
    model: "deepseek-v4-flash",
    label: "DeepSeek V4 Flash",
    thinking: "disabled",
  },
  pro: {
    name: "pro",
    model: "deepseek-v4-pro",
    label: "DeepSeek V4 Pro",
    thinking: "enabled",
    reasoningEffort: "high",
  },
} as const satisfies Record<"flash" | "pro", ModelProfile>;

export function resolveModelProfile(name: string | undefined | null): ModelProfile {
  switch (name) {
    case "pro":
    case "smart":
    case "max":
      return MODEL_PROFILES.pro;
    case "auto":
    case "flash":
    case "fast":
    case undefined:
    case null:
    case "":
      return MODEL_PROFILES.flash;
    default:
      return MODEL_PROFILES.flash;
  }
}
