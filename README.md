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

## Attribution

Carbon Code selectively imports and adapts architecture and agent primitives
from DeepSeek-Reasonix under the MIT license. See
`THIRD_PARTY_NOTICES.md` and `LICENSES/DeepSeek-Reasonix-MIT.txt`.
