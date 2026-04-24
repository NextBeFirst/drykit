# drykit

CLI tool that prevents AI (Claude Code, Kiro) from creating duplicate components in React projects.

## Quick Start

```bash
npx drykit init
drykit scan
```

## Commands

| Command | Description |
|---------|-------------|
| `drykit init` | Initialize drykit in current project |
| `drykit scan` | Scan project, update registry + fingerprint |
| `drykit add <Name>` | Scaffold/register a component |
| `drykit check [--ci]` | Validate registry |
| `drykit docs` | Generate COMPONENTS.md |

## How It Works

1. **Registry** (`registry.json`) — source of truth for all components
2. **Fingerprint** (`.drykit/`) — token-optimized AI memory files
3. **AI Config** — rules in CLAUDE.md, AGENTS.md, .kiro/steering/
4. **Pre-commit hook** — blocks unregistered/duplicate components

## License

MIT
