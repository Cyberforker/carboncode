# Carbon Code

Chinese-first, DeepSeek-powered terminal coding agent derived from
DeepSeek-Reasonix.

Carbon Code is aimed at personal developer workflows: open a repository, let the
agent read and search the codebase, review planned edits, approve shell commands,
run validation, and keep a concise session trail.

## Install

Requires Node.js 22 or newer.

```bash
npm install -g @carboncode/cli
cd path/to/project
carboncode
```

Short command:

```bash
ccode
```

One-off usage without a global install:

```bash
npx @carboncode/cli
```

## Commands

| Command | Purpose |
| --- | --- |
| `carboncode` / `carboncode code [dir]` | Coding agent rooted at the current project. |
| `carboncode chat` | Chat without filesystem or shell tools. |
| `carboncode run "task"` | Non-interactive one-shot task. |
| `carboncode doctor` | Local health check. |
| `carboncode update` | Check and install the latest CLI package. |

Carbon Code also installs `ccode`. It intentionally does not install `cc`,
because that name commonly points to the system C compiler.

## Configuration

Carbon Code stores user configuration in:

```text
~/.carboncode/config.json
```

Set a DeepSeek API key with the first-run setup wizard, or export it directly:

```bash
export DEEPSEEK_API_KEY=sk-...
```

Project rules should live in `AGENTS.md` or `CARBON.md` in the repository.

## Release

Publishing is tag-driven through GitHub Actions trusted publishing. Update
`package.json`, commit the release, then push a matching semver tag:

```bash
git tag v0.1.0
git push origin main --tags
```

The `Publish npm package` workflow verifies the package, checks that the tag
matches `package.json`, and runs `npm publish --access public --provenance`.

## Current Scope

This repository currently imports the Reasonix main codebase and productizes it
as Carbon Code. The first productization pass covers package identity, command
names, Carbon config paths, update/install commands, Chinese-first CLI copy, npm
publishing, and license attribution.

## License And Attribution

Carbon Code is MIT licensed. It is derived from DeepSeek-Reasonix, which is also
MIT licensed.

The upstream notice is preserved in:

- `THIRD_PARTY_NOTICES.md`
- `LICENSES/DeepSeek-Reasonix-MIT.txt`

Do not remove upstream copyright or MIT notices from derived files.
