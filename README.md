# Carbon Code

Carbon Code is a Chinese-first, DeepSeek-powered terminal coding agent for
personal developer workflows.

```bash
npm install -g @carboncode/cli
cd path/to/project
carboncode
```

Current commands:

```bash
carboncode setup --api-key sk-...
carboncode
carboncode doctor
carboncode models
carboncode run "阅读项目并修复测试" --yes
```

The default model profiles are:

- `flash`: `deepseek-v4-flash`
- `pro`: `deepseek-v4-pro`

Configuration is stored at:

```text
~/.carboncode/config.json
```

Project rules are loaded from `CARBON.md` and `AGENTS.md`, in that order.

## Current MVP Behavior

- `carboncode` starts a Chinese interactive task loop.
- `carboncode run <task>` runs one non-interactive task.
- `carboncode doctor` checks local DeepSeek connectivity without printing the API key.
- File tools can list files, read UTF-8 files with truncation, search names/content, and apply unique search/replace edits.
- Edits and shell commands go through approval unless `--yes` is used.
- Agent messages preserve DeepSeek/OpenAI-compatible `tool_calls` before tool results.
- Output includes token count and an estimated USD cost based on DeepSeek V4 pricing.

Do not commit `~/.carboncode/config.json`; it is a user-level secret file.

## Attribution

Carbon Code selectively imports and adapts architecture and agent primitives
from DeepSeek-Reasonix under the MIT license. See
`THIRD_PARTY_NOTICES.md` and `LICENSES/DeepSeek-Reasonix-MIT.txt`.
