# Security Policy

Report Carbon Code security issues privately to the repository owner.

Include:

- a clear description of the issue
- reproduction steps
- Carbon Code version (`carboncode --version`)
- platform and Node.js version

## Scope

In scope:

- the published `@carboncode/cli` npm package
- the local CLI/TUI and dashboard server
- shell approval, edit approval, config loading, and tool dispatch behavior

Out of scope:

- third-party MCP servers
- user-provided shell hooks or commands
- compromised local API keys or shell profiles

## Key Handling

DeepSeek API keys belong in environment variables or
`~/.carboncode/config.json`. Treat that file as a credential store and do not
commit it.
