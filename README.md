# drykit

### The AI-native DRY enforcer for React projects.
### Stop burning tokens. Stop shipping duplicates. Stop fighting your AI.

> **TL;DR** — Your AI assistant doesn't know your codebase exists. Every session it re-discovers it, re-reads the same files, and still creates `Modal2.tsx` because it forgot what you built yesterday. **drykit** gives it a 200-token memory file that answers "does this already exist?" in one read — instead of 50,000 tokens of exploratory file-walking.

---

## Why this exists

Every AI coding session looks the same:

```
You:   "Add a confirmation dialog when the user deletes an item."
AI:    [reads 20 files trying to understand your structure]
AI:    [misses your existing Modal with variant="confirmation"]
AI:    [creates ConfirmModal.tsx]
You:   "...we already have that. It's in Modal."
AI:    "You're right! Let me fix that."
You:   [pays for tokens twice. Ships a duplicate anyway because you forgot to delete it.]
```

Multiply by every PR. Every dev. Every session. Your codebase rots into a graveyard of `Modal`, `ModalV2`, `ConfirmModal`, `DeleteModal`, `ConfirmDeleteModal` — all ~90% identical, all impossible to refactor because now eight screens import different ones.

**drykit is the fix.** It's a pure-Node CLI (zero AI calls, zero API keys, zero tokens on the tool itself) that keeps a machine-readable registry of everything in your project and hands the AI a tiny, pre-digested summary every session.

---

## The token math (why this actually matters)

**Without drykit** — AI orients itself every session:

| Action | Tokens |
|---|---|
| List `src/components/`, `src/hooks/`, `src/utils/` | ~2k |
| Read 10–20 files to figure out what exists | 30k–80k |
| Re-read the same files next session (no memory) | 30k–80k |
| **Per dev, per week** (≈20 sessions) | **~1M tokens** |

**With drykit** — AI reads one 200-token fingerprint:

| Action | Tokens |
|---|---|
| Read `.drykit/fingerprint.md` | ~200 |
| If building UI → read `.drykit/front.md` | ~1–3k |
| If building API → read `.drykit/api.md` | ~1–3k |
| **Per dev, per week** (≈20 sessions) | **~20–60k tokens** |

> **~95% fewer tokens spent on orientation.** At Claude Sonnet pricing (~$3/M input) that's $3–5/dev/month back in your pocket per IC — but the real win is **latency** and **accuracy**. Fewer wrong turns. Fewer duplicates. Faster sessions.

And that's before counting the tokens the AI would have spent **writing** the duplicate component you didn't need.

---

## What it actually does

### 1. Scans your project (pure Node, zero AI)
Walks `src/components`, `src/hooks`, `src/utils`, `src/app/api`, `src/schemas` — extracts names, paths, props, variants, dependencies. Puts it all in `src/registry.json`.

### 2. Builds a layered AI memory (token-optimized)
```
.drykit/
├── fingerprint.md     ~200 tokens — ALWAYS loaded at session start
│                      → "Here's the map. Check front.md before UI work,
│                         api.md before backend work."
├── front.md           ~1–3k tokens — UI inventory (components, hooks, variants)
└── api.md             ~1–3k tokens — routes, schemas, endpoints
```

The AI only pulls detail files **when the task requires them.** Not every session. Not every turn.

### 3. Writes rules into every AI tool you use
- **`CLAUDE.md`** — Claude Code reads this at session start
- **`AGENTS.md`** — Kiro's native memory format
- **`.kiro/steering/drykit.md`** — always-included rule: *"check the registry BEFORE creating"*
- **`.claude/agents/drykit-scanner.md`** — Haiku subagent for fast registry scans
- **`.claude/agents/drykit-architect.md`** — Sonnet subagent for architecture review

### 4. Blocks duplicates at commit time
A `pre-commit` hook runs `drykit check --ci`. If you try to commit `ConfirmModal.tsx` when `Modal` already covers that variant, **the commit fails** with a useful message — not six months later in a Slack thread titled "why do we have four modals."

---

## Before vs. after

**Before drykit:**
```
src/components/
├── Modal.tsx
├── Modal2.tsx               ← "quick tweak for the delete flow"
├── ConfirmModal.tsx         ← Alice didn't know Modal existed
├── DeleteModal.tsx          ← Bob didn't know ConfirmModal existed
├── ConfirmDeleteModal.tsx   ← the AI made this last Tuesday
└── Dialog.tsx               ← somebody googled "React dialog"
```

**After drykit:**
```
src/components/
└── Modal.tsx                ← variants: primary | confirmation | form | delete
                                registered in registry.json
                                documented in src/docs/Modal.md
                                AI knows it exists. Forever.
```

---

## Quick start

```bash
cd your-react-project
npx drykit init     # wizard: detects your stack, writes config + hooks
npx drykit scan     # builds registry + fingerprint
```

Commit and push. From the next session on, every AI tool in your setup will know what exists **before** it writes anything.

---

## Commands

| Command | What it does |
|---|---|
| `drykit init` | Scan structure, configure Claude Code + Kiro, install pre-commit hook |
| `drykit scan` | Rebuild `registry.json` and all `.drykit/` files |
| `drykit add <Name>` | Scaffold + register a new component (doc stub included) |
| `drykit check` | Show unregistered files and near-duplicates (fuzzy + AST) |
| `drykit check --ci` | Same, exits 1 on issues — wired into pre-commit |
| `drykit docs` | Regenerate `docs/COMPONENTS.md` from the registry |
| `drykit eject` | Nuke all drykit files from the project |

---

## What gets generated

```
your-project/
├── drykit.config.mjs        # scan paths, registry location, DRY-risk keywords
├── src/registry.json        # source of truth — every component, hook, util
├── .drykit/
│   ├── fingerprint.md       # ~200 tokens — the AI's permanent memory card
│   ├── front.md             # full UI inventory
│   └── api.md               # routes + schemas
├── AGENTS.md                # Kiro reads this natively
├── CLAUDE.md                # drykit section appended (keeps your existing notes)
├── .kiro/steering/
│   ├── drykit.md            # always-on rules
│   └── drykit-front.md      # auto-updated on every scan
└── .claude/agents/
    ├── drykit-scanner.md    # Haiku agent — fast, cheap registry maintenance
    └── drykit-architect.md  # Sonnet agent — deeper architecture reviews
```

---

## The core idea: registry → view, not the other way around

```
┌──────────────────────────────────────────────────────────┐
│  INSTRUCTIONS (what AI should do)                        │
│  CLAUDE.md + AGENTS.md + .kiro/steering/                 │
│  → "Read the fingerprint BEFORE creating anything."      │
├──────────────────────────────────────────────────────────┤
│  MEMORY (what exists — token-optimized)                  │
│  .drykit/fingerprint.md   → map + recently changed       │
│  .drykit/front.md         → UI details on demand         │
│  .drykit/api.md           → API details on demand        │
├──────────────────────────────────────────────────────────┤
│  REGISTRY (source of truth — machine-readable)           │
│  src/registry.json                                       │
│  → scripts read this, fingerprint is a VIEW over it      │
├──────────────────────────────────────────────────────────┤
│  PROTECTION (the safety net)                             │
│  pre-commit hook — pure Node, zero AI, zero tokens       │
│  → blocks unregistered files + near-duplicates           │
└──────────────────────────────────────────────────────────┘
```

**Key design decisions:**
- `registry.json` is the database. The fingerprint is a compact **view** generated from it.
- The entire scan/check/fingerprint pipeline is **pure Node.js**. No AI calls. No API keys. No tokens spent on the tool itself — every token drykit saves is pure profit.
- AI agents (`.claude/agents/`, `.kiro/agents/`) are an **optional** layer. drykit works 100% without them.

---

## Who this is for

- **Teams shipping with Claude Code, Kiro, Cursor, or Copilot** who are tired of duplicate components and bloated sessions.
- **Solo devs** whose projects grow faster than they can remember what they built last month.
- **Anyone who's ever paid for an AI session that ended with "oh we already had that."**

If your project has more than ~10 components, drykit pays for itself in the first week.

---

## Configuration

`drykit.config.mjs` — auto-generated, auto-detected, always editable:

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
  // These names trigger a fuzzy-match check — the AI will be extra careful
  // before creating anything that looks like one of these.
  dryRisk: ['Modal', 'Form', 'Card', 'Button', 'Dialog', 'Drawer',
            'Toast', 'Dropdown', 'Select', 'Input', 'Table'],
};
```

---

## FAQ

**Does this work with TypeScript?** Yes. Props and variants are parsed from the AST.

**Does it slow down commits?** The check is a pure Node scan of already-staged files — milliseconds on typical projects.

**What about React Native / Vue / Svelte?** v1 is React-only. Config is generic enough that other frameworks are on the roadmap.

**Does this replace my design system?** No — it makes it impossible for your AI to quietly ignore the one you already have.

**What if I don't use Claude Code or Kiro?** The registry and pre-commit hook still work. You'd just skip the `CLAUDE.md` / `AGENTS.md` generation.

**Will it overwrite my existing `CLAUDE.md`?** No. drykit appends a clearly-marked section and leaves the rest alone.

---

## Requirements

- Node.js 20+
- A React project (Next.js, Vite, Remix, plain CRA — anything)
- Claude Code or Kiro (optional but recommended — that's where most of the value lands)

---

## License

MIT — use it, fork it, ship it.
