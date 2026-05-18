import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export type SessionRole = "system" | "user" | "assistant" | "tool";

export interface SessionMessage {
  role: SessionRole;
  content: string;
  tool_call_id?: string;
}

export function defaultSessionDir(home = homedir()): string {
  return join(home, ".carboncode", "sessions");
}

export class SessionStore {
  constructor(private readonly dir = defaultSessionDir()) {}

  save(name: string, messages: readonly SessionMessage[]): void {
    mkdirSync(this.dir, { recursive: true });
    writeFileSync(this.pathFor(name), JSON.stringify(messages, null, 2), "utf8");
  }

  load(name: string): SessionMessage[] {
    try {
      const parsed = JSON.parse(readFileSync(this.pathFor(name), "utf8"));
      return Array.isArray(parsed) ? (parsed as SessionMessage[]) : [];
    } catch {
      return [];
    }
  }

  list(): string[] {
    try {
      return readdirSync(this.dir)
        .filter((file) => file.endsWith(".json"))
        .map((file) => decodeURIComponent(file.slice(0, -5)))
        .sort();
    } catch {
      return [];
    }
  }

  private pathFor(name: string): string {
    return join(this.dir, `${encodeURIComponent(name)}.json`);
  }
}
