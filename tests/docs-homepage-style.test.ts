import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("docs homepage Codex-style reset", () => {
  it("keeps the landing page focused on a restrained developer-tool surface", () => {
    const styles = read("docs/src/styles.css");
    const hero = read("docs/src/hero.jsx");
    const index = read("docs/index.html");

    expect(styles).toContain("--surface");
    expect(styles).toContain("--line");
    expect(styles).toContain("--success");
    expect(styles).not.toMatch(/Instrument Serif|sodium|ochre|warm ink|editorial/i);

    expect(hero).toContain("npm install -g @carboncode/cli");
    expect(hero).toContain("https://github.com/Yapie0/carboncode");
    expect(hero).toContain("https://www.npmjs.com/package/@carboncode/cli");
    expect(hero).not.toMatch(/hero-stats|94\.2|2\.5|2837|Download desktop/);

    expect(index).toContain("carboncode GitHub");
    expect(index).toContain("DeepSeek-powered terminal coding agent");
  });
});
