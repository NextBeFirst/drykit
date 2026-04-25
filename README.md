# drykit

**ESLint catches syntax errors. TypeScript catches type errors. Drykit catches "AI just created Modal2."**

A linter for AI behavior. Pure Node CLI — zero AI calls, zero API keys, zero tokens spent on the tool itself.

> Your AI assistant creates `ConfirmModal.tsx` because it doesn't know `Modal` already has a `confirmation` variant. Drykit gives it a 200-token memory file instead of 50,000 tokens of file-walking — and blocks the duplicate at commit time.

---

## Try it now (existing project)

```bash
cd your-react-project
npx drykit scan
```

That's it. Drykit scans your project, builds a registry, and tells you what it found. No install, no config, no commitment.

Ready to go all-in? `npx drykit init` sets up the full pipeline.

---

## Three layers of protection

```
┌─────────────────────────────────────────────────────┐
│  1. PREVENTION (before AI generates)                │
│  Claude Code skill + .cursorrules + AGENTS.md       │
│  → AI checks registry BEFORE writing new files      │
├─────────────────────────────────────────────────────┤
│  2. DETECTION (at commit time)                      │
│  pre-commit hook → drykit check --ci                │
│  → blocks duplicates, unregistered files, secrets   │
├─────────────────────────────────────────────────────┤
│  3. VISIBILITY (ongoing)                            │
│  drykit health / drykit stats                       │
│  → god-objects, missing docs, token savings counter │
└─────────────────────────────────────────────────────┘
```

**Duplicates** — catches `ConfirmModal` when `Modal variant="confirmation"` exists.
**Unregistered files** — catches components that slipped past the registry.
**Secrets** — catches hardcoded Stripe keys, AWS tokens, passwords in source files.

---

## The token math

**Without drykit** — AI orients itself every session:

| Action | Tokens |
|---|---|
| Read 10–20 files to figure out what exists | 30k–80k |
| Re-read the same files next session | 30k–80k |
| **Per week** (~20 sessions) | **~1M tokens** |

**With drykit** — AI reads one 200-token fingerprint:

| Action | Tokens |
|---|---|
| Read `.drykit/fingerprint.md` | ~200 |
| Read `front.md` or `api.md` on demand | ~1–3k |
| **Per week** (~20 sessions) | **~20–60k tokens** |

> ~95% fewer tokens on orientation (estimate). The real win is accuracy — fewer wrong turns, fewer duplicates, faster sessions.

---

## Before vs. after

**Before:**
```
src/components/
├── Modal.tsx
├── Modal2.tsx               ← "quick tweak"
├── ConfirmModal.tsx         ← AI didn't know Modal existed
├── DeleteModal.tsx          ← another AI session
├── ConfirmDeleteModal.tsx   ← AI made this last Tuesday
└── Dialog.tsx               ← somebody googled "React dialog"
```

**After:**
```
src/components/
└── Modal.tsx                ← variants: primary | confirmation | form | delete
                                registered, documented, AI knows it exists
```

---

## Commands

| Command | What it does |
|---|---|
| `drykit init` | Detect structure, configure all AI tools, install hooks |
| `drykit scan` | Rebuild registry + fingerprint from source |
| `drykit add <Name>` | Scaffold + register a new component |
| `drykit check` | Duplicates + unregistered + secrets scan |
| `drykit check --json` | Structured JSON output for CI/tooling |
| `drykit check --ci` | Exit codes: 0=clean, 1=warnings, 2=errors |
| `drykit check --report` | Markdown report to stdout |
| `drykit check --report-file <path>` | Markdown report to file (for PR comments) |
| `drykit merge <A> <B>` | Merge duplicate components into one |
| `drykit health` | Large files, missing docs, progress counter |
| `drykit stats` | Cumulative token savings (estimate) |
| `drykit docs` | Generate COMPONENTS.md from registry |
| `drykit eject` | Remove all drykit files |

---

## What gets generated

```
your-project/
├── drykit.config.mjs              # scan paths, DRY-risk keywords
├── src/registry.json              # source of truth
├── .drykit/
│   ├── fingerprint.md             # ~200 tokens — AI reads this first
│   ├── front.md                   # UI inventory (on demand)
│   ├── api.md                     # routes + schemas (on demand)
│   └── savings.json               # cumulative token savings
├── .cursorrules                   # Cursor reads this
├── AGENTS.md                      # Codex / Kiro reads this
├── CLAUDE.md                      # drykit section appended
├── .claude/
│   ├── skills/drykit/SKILL.md     # proactive registry check
│   ├── agents/drykit-scanner.md   # Haiku subagent
│   ├── agents/drykit-architect.md # Sonnet subagent
│   └── hooks/drykit-pretooluse.mjs # blocks writes before they happen
├── .kiro/
│   ├── steering/drykit.md         # always-on rules
│   └── steering/drykit-front.md   # auto-updated on scan
└── .husky/pre-commit              # drykit check --ci
```

---

## How it works

1. **`drykit scan`** walks your source, extracts names/props/variants/dependencies, writes `registry.json`
2. **`.drykit/fingerprint.md`** is a 200-token summary the AI reads at session start — instead of reading 20 files
3. **AI tools** (Claude Code, Kiro, Cursor) get rules injected: "check the registry BEFORE creating"
4. **`drykit check --ci`** runs at pre-commit — blocks duplicates, unregistered files, and hardcoded secrets
5. **`drykit check --report`** generates a markdown report — duplicates, inconsistent prop usage, secrets, unregistered
6. **`drykit stats`** tracks how many issues were caught over time, with weekly deltas

The entire pipeline is pure Node.js. No AI calls. No API keys. No tokens spent on the tool itself.

---

## Who this is for

For developers who ship with AI.

- Teams using Claude Code, Kiro, Cursor, or Copilot
- Projects with 10+ components where the AI keeps reinventing the wheel
- Anyone who's paid for an AI session that ended with "oh, we already had that"

---

## Configuration

`drykit.config.mjs` — auto-detected, always editable:

```js
export default {
  projectName: 'my-app',
  stack: 'Next.js 15 + Tailwind 4',
  scan: {
    components: ['src/components/**/*.tsx'],
    hooks:      ['src/hooks/**/*.ts'],
    utils:      ['src/utils/**/*.ts'],
    routes:     ['src/app/api/**/*.ts'],
    schemas:    ['src/schemas/**/*.ts'],
  },
  registry: 'src/registry.json',
  dryRisk: ['Modal', 'Form', 'Card', 'Button', 'Dialog', 'Drawer',
            'Toast', 'Dropdown', 'Select', 'Input', 'Table'],
};
```

---

## FAQ

**Does it slow down commits?** No. Pure Node scan — milliseconds on typical projects.

**React Native / Vue / Svelte?** v1 is React-only. Other frameworks on the roadmap.

**Does it replace my design system?** No — it makes it impossible for AI to quietly ignore the one you already have.

**Will it overwrite my CLAUDE.md?** No. Appends a marked section, leaves the rest alone.

**What if I don't use Claude Code?** Registry + pre-commit + .cursorrules still work. The Claude-specific files are optional.

---

## Requirements

- Node.js 20+
- A React project (Next.js, Vite, Remix — anything)

---

## License

MIT
