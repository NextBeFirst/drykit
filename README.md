# claudestarter

A drop-in, DRY development workflow for Claude Code. Prevents component
duplication, keeps a live registry, and feeds Claude fresh project context
through `CLAUDE.md`.

Works with any JS/TS project — optimized for **React, Next.js, and TypeScript**,
but the core scripts are stack-agnostic.

## What you get

- **`CLAUDE.md`** — a living spec Claude reads at the start of every session
- **`src/registry.json`** — the source of truth for every component, hook, util
- **`scripts/register-component.mjs`** — CLI to add a component to the registry
- **`scripts/check-duplicates.mjs`** — flags near-duplicate components (fuzzy match)
- **`scripts/generate-docs.mjs`** — rebuilds `docs/COMPONENTS.md` from the registry
- **`.husky/pre-commit`** — blocks commits that introduce unregistered components
- **`.claude/settings.json`** — hooks that nudge Claude to update the registry

## Install into a new project

```bash
npx degit YOUR_GH_USER/claudestarter my-project
cd my-project
npm install
npx husky init
npm run registry:check
```

## Install into an existing project

```bash
# from your project root
npx degit YOUR_GH_USER/claudestarter#main . --force
npm install --save-dev husky
npx husky init
```

Then open `CLAUDE.md` and fill in the `[NAZWA_PROJEKTU]`, `[TECH_STACK]`,
`[CSS_FRAMEWORK]` placeholders at the top.

## Daily workflow

```bash
# before creating a new component, search the registry
npm run registry:find Modal

# after creating a component
npm run component:register Modal src/components/Modal.tsx

# scan for duplicates manually
npm run registry:duplicates

# regenerate docs
npm run docs:generate
```

The pre-commit hook runs `registry:check` automatically — if you add a `.tsx`
file under `src/components/` that isn't in `registry.json`, the commit is
blocked with a message telling you which command to run.

## Philosophy

1. **One CLAUDE.md to rule them all.** Claude doesn't re-read the codebase on
   every turn; it reads `CLAUDE.md`. Keep it current.
2. **Registry is the source of truth.** If it's not in `registry.json`, it
   doesn't exist. Period.
3. **Variants, not new components.** `Modal variant="confirmation"` — never
   `ConfirmModal`.
4. **The hook enforces it.** Humans forget. Git hooks don't.

## License

MIT
