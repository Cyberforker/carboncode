# Reasonix Broad Import Design

Date: 2026-05-18

## Summary

Carbon Code should import the Reasonix body, then productize it as Carbon Code.
The current small Carbon core proves
the package name, DeepSeek V4 profiles, npm publishing, and attribution flow, but it
does not provide enough agent surface to become a Chinese-first Codex-like CLI
quickly.

## Decision

Import the Reasonix repository body into Carbon Code and productize it in place.
Carbon Code keeps its repository, package identity, publishing workflow, license
notice files, and project docs. Reasonix supplies the main CLI/TUI, agent loop,
tooling, session, memory, MCP, transcript, dashboard, repair, and validation
subsystems.

## Carbon Productization Requirements

- Package name remains `@carboncode/cli`.
- Default commands are `carboncode` and `ccode`.
- Do not install `cc`.
- Default config path becomes `~/.carboncode/config.json`.
- User-facing product name becomes Carbon Code.
- Reasonix MIT license text remains in `LICENSES/DeepSeek-Reasonix-MIT.txt`.
- `THIRD_PARTY_NOTICES.md` stays discoverable in the npm package.
- npm publish workflow stays tag-driven through GitHub Actions Trusted Publishing.
- DeepSeek V4 Flash and V4 Pro remain the Carbon model profiles.
- Chinese UX is the default direction, even where upstream English text remains
  temporarily during the import.

## Import Scope

Import the upstream source, tests, scripts, examples, dashboard, desktop stubs,
MCP, memory, repair, transcript, semantic index, and CLI commands. Defer deep
feature pruning until the imported base builds and the main CLI boots.

## Risks

- Importing the full upstream can break the current small Carbon tests.
- Upstream scripts may assume Reasonix package names, dashboard paths, desktop
  files, or release metadata.
- Full upstream test suite may be too broad for the first import pass.
- Some product strings will remain Reasonix-branded until follow-up passes.

## First Success Criteria

- Repository contains the Reasonix body plus Carbon publishing and attribution.
- `package.json` exposes `@carboncode/cli`, `carboncode`, and `ccode`.
- `npm install` succeeds.
- `npm run build` succeeds or has a narrow, documented failure to fix next.
- `node dist/cli/index.js --help` boots under the Carbon command name after build.
- Carbon attribution files are still included by `npm pack --dry-run`.
