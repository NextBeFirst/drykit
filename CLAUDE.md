# CLAUDE.md

> This file is the **single source of truth** that Claude Code reads at the
> start of every session. Keep it current. If a fact changes, update this file
> in the same commit.

## Project

- **Name:** `[NAZWA_PROJEKTU]`
- **Stack:** `[TECH_STACK]` (e.g. React 19, Next.js 15, TypeScript 5)
- **CSS:** `[CSS_FRAMEWORK]` (e.g. Tailwind 4)
- **TypeScript:** `[TYPESCRIPT]` (true/false)

## Architecture Overview

_One paragraph. What does this app do? What are the top-level directories?_

```
src/
├── app/            # Next.js app router (if applicable)
├── components/     # Reusable UI — EVERYTHING here must be in registry.json
├── hooks/          # Custom hooks — also registered
├── utils/          # Pure helpers — also registered
└── registry.json   # Source of truth
```

## Rules for New Components

### ✅ DO

- **Check `src/registry.json` BEFORE creating** anything named `Modal`, `Form`,
  `Card`, `Button`, `Dialog`, `Drawer`, `Toast`, `Dropdown`, `Select`, `Input`.
- **Use variants, not new components.** `<Modal variant="confirmation" />`, not
  `<ConfirmModal />`.
- **Register it.** `npm run component:register [Name] [path]`.
- **Document it.** A one-file entry in `src/docs/[Name].md` with usage examples.
- **Update this file** if you introduce a new architectural pattern.

### ❌ DON'T

- Create `Modal2`, `ModalNew`, `ConfirmModal`, `ModalV2`, or anything like it.
- Copy-paste an existing component to tweak two lines — add a variant instead.
- Skip the registry because "it's just a quick one" — those are the worst ones.
- Modify a registered component without bumping `lastModified` in the registry.

## Pre-Commit Checklist

Before every commit the hook verifies:

- [ ] Every `.tsx`/`.ts` in `src/components/`, `src/hooks/`, `src/utils/` is in
      `registry.json`.
- [ ] No near-duplicate component names (Levenshtein + AST similarity).
- [ ] `docs/COMPONENTS.md` is regenerated if the registry changed.

Run manually:

```bash
npm run registry:check
npm run registry:duplicates
```

## Component Library Status

_Auto-generated from `src/registry.json` by `npm run docs:generate`. Do not edit
this section by hand — it will be overwritten._

<!-- REGISTRY:START -->
_Updated: 2026-04-24_

**components** (2)

- `Modal` (beta) — `src/components/Modal.tsx` — variants: primary, confirmation, form
- `ConfirmModal` (beta) — `src/components/ConfirmModal.tsx`

<!-- REGISTRY:END -->

## Current Duplicates / Tech Debt

_Things Claude should help refactor. Remove items as they're resolved._

- **`ConfirmModal` is a deliberate anti-pattern example.** It's shipped with
  the template so `npm run registry:duplicates` has something to warn about.
  Delete `src/components/ConfirmModal.tsx`, its doc stub, and its registry
  entry once you've seen the warning in action.
- **`Modal` is a canonical example** showing the variant pattern. Keep it as
  a reference or replace it with your own `Modal` when you're ready.

## Recent Changes

_Last 10 component changes. Auto-updated by the post-register script._

<!-- CHANGELOG:START -->
_(none yet)_
<!-- CHANGELOG:END -->

## Models / Interfaces

_Shared Zod schemas / TS types live in `src/schemas/`. Link them here once you
have them._

- _(none yet)_

## How Claude Should Behave in This Repo

- **Always read `src/registry.json` before proposing a new component.** If a
  registered component could do the job with a new variant, propose that instead.
- **Never suggest a filename like `Foo2.tsx` or `FooNew.tsx`.** If a component
  needs a breaking change, suggest a migration plan.
- **Mention the registry entry** when referencing a component in answers, so the
  user can jump to it.
- **Keep this file's sections stable.** When adding a note, add it to the
  matching existing section rather than creating a new one.
