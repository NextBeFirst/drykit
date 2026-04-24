# drykit

**Stop AI from creating duplicate components in your React project.**

Claude Code, Kiro, and other AI tools don't know what components you already have. They create `ConfirmModal` when you have `Modal`, `CardItem` when you have `Card`, `useUserAuth` when you have `useAuth`. drykit fixes this.

---

## How it works

1. **Scans your project** — finds all components, hooks, utils, routes, schemas
2. **Builds a registry** (`registry.json`) — source of truth for everything that exists
3. **Generates AI memory files** (`.drykit/`) — token-optimized fingerprints the AI reads at session start
4. **Configures your AI tools** — writes rules into `CLAUDE.md`, `AGENTS.md`, `.kiro/steering/`
5. **Blocks duplicates at commit time** — pre-commit hook runs `drykit check --ci`

---

## Quick start

```bash
cd your-react-project
npx drykit init
npx drykit scan
```

That's it. Your AI now knows what exists before it creates anything.

---

## Commands

| Command | Description |
|---------|-------------|
| `drykit init` | Scan project structure, configure AI tools, set up pre-commit hook |
| `drykit scan` | Re-scan project, update registry + fingerprint files |
| `drykit add <Name>` | Scaffold a new component and register it |
| `drykit check` | Show unregistered files and potential duplicates |
| `drykit check --ci` | Same, but exits with code 1 (for CI/pre-commit) |
| `drykit docs` | Generate `COMPONENTS.md` from registry |
| `drykit eject` | Remove all drykit files from project |

---

## What gets generated

```
your-project/
├── drykit.config.mjs        # scan paths, registry location, DRY-risk keywords
├── src/registry.json        # source of truth — all components, hooks, utils
├── .drykit/
│   ├── fingerprint.md       # ~200 tokens — AI reads this every session
│   ├── front.md             # full component/hook/util inventory
│   └── api.md               # routes + schemas
├── AGENTS.md                # Kiro reads this natively
├── CLAUDE.md                # drykit section appended
├── .kiro/steering/
│   ├── drykit.md            # always-included rules
│   └── drykit-front.md      # auto-updated on scan
└── .claude/agents/
    ├── drykit-scanner.md    # Haiku agent for registry scans
    └── drykit-architect.md  # Sonnet agent for architecture review
```

---

## The AI memory pattern

drykit uses a **layered fingerprint** to minimize token usage:

```
fingerprint.md (~200 tokens) — always loaded
  ↓ "building UI?" → read front.md
  ↓ "building API?" → read api.md
```

The AI only loads detail files when relevant. No wasted tokens.

---

## Configuration

`drykit.config.mjs` is auto-generated and auto-detected from your project structure:

```js
export default {
  projectName: 'my-app',
  stack: 'Next.js 15 + Tailwind 4',
  scan: {
    components: ['src/components/**/*.tsx'],
    hooks: ['src/hooks/**/*.ts'],
    utils: ['src/utils/**/*.ts'],
    routes: ['src/app/api/**/*.ts'],
    schemas: ['src/schemas/**/*.ts'],
  },
  registry: 'src/registry.json',
  dryRisk: ['Modal', 'Form', 'Card', 'Button', 'Dialog', 'Drawer',
            'Toast', 'Dropdown', 'Select', 'Input', 'Table'],
};
```

---

## Requirements

- Node.js 20+
- React project (Next.js, Vite, etc.)
- Claude Code or Kiro (or both)

---

## License

MIT
