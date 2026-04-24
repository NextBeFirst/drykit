# drykit — Design Spec

**Data:** 2026-04-24
**Status:** Draft v2 (post-review)
**Nazwa pakietu:** `drykit` (npm)

---

## Problem

AI (Claude Code, Kiro, inne) nie wie co istnieje w projekcie. Tworzy duplikaty komponentów — `Modal2.tsx`, `ConfirmModal.tsx`, `ModalNew.tsx` — bo nie ma pamięci między sesjami i nie czyta rejestru przed tworzeniem.

Istniejące rozwiązania (`CLAUDE.md`, `.kiro/steering/`) wymagają ręcznego utrzymywania. Nikt tego nie robi regularnie.

## Rozwiązanie

CLI narzędzie które:
1. Skanuje projekt i buduje rejestr komponentów/hooks/utils (czysty Node.js, zero tokenów AI)
2. Generuje kompaktową "pamięć" (fingerprint) zoptymalizowaną pod tokeny AI
3. Konfiguruje AI (Claude Code + Kiro) żeby czytało fingerprint ZANIM cokolwiek stworzy
4. Blokuje commity z niezarejestrowanymi lub zduplikowanymi komponentami

## Architektura

```
┌─────────────────────────────────────────────────┐
│  INSTRUKCJE (co AI ma robić)                    │
│  AGENTS.md (Kiro native) + CLAUDE.md            │
│  + .kiro/steering/                              │
│  → "Przeczytaj fingerprint ZANIM coś stworzysz" │
├─────────────────────────────────────────────────┤
│  PAMIĘĆ (co istnieje w projekcie)               │
│  .drykit/fingerprint.md  → routing + changed    │
│  .drykit/front.md        → UI, komponenty       │
│  .drykit/api.md          → endpointy, schemas   │
├─────────────────────────────────────────────────┤
│  REJESTR (source of truth)                      │
│  registry.json (lokalizacja konfigurowalna)     │
│  → machine-readable, skrypty czytają            │
│  → fingerprint jest WIDOKIEM na rejestr         │
├─────────────────────────────────────────────────┤
│  OCHRONA (blokada duplikatów)                   │
│  pre-commit hook (czysty Node.js, zero AI)      │
│  → blokuje niezarejestrowane + duplikaty        │
└─────────────────────────────────────────────────┘
```

Kluczowe decyzje:
- `registry.json` to baza danych, fingerprint to widok dla AI
- Fingerprint generowany z rejestru — nigdy odwrotnie
- Cały pipeline (scan, check, fingerprint) to czysty Node.js — zero wywołań AI, zero tokenów, zero API keys
- Agenci AI (.claude/agents/, .kiro/agents/) to opcjonalny layer — pomagają w pracy, ale drykit działa bez nich

---

## 1. Konfiguracja — `drykit.config.mjs`

Każdy projekt może mieć inną strukturę. Konfiguracja w root projektu:

```js
// drykit.config.mjs
export default {
  // Ścieżki do skanowania (glob patterns)
  scan: {
    components: ['src/components/**/*.tsx', 'components/**/*.tsx'],
    hooks: ['src/hooks/**/*.ts', 'hooks/**/*.ts'],
    utils: ['src/utils/**/*.ts', 'lib/**/*.ts'],
    routes: ['src/routes/**/*.ts', 'src/app/api/**/*.ts'],
    schemas: ['src/schemas/**/*.ts', 'src/types/**/*.ts'],
  },

  // Lokalizacja rejestru
  registry: 'src/registry.json',

  // Lokalizacja doc stubs
  docs: 'docs/components',

  // Słowa kluczowe DRY-risk (fuzzy match na te nazwy)
  dryRisk: ['Modal', 'Form', 'Card', 'Button', 'Dialog', 'Drawer',
            'Toast', 'Dropdown', 'Select', 'Input', 'Table'],

  // Język generowanych plików (en | pl)
  lang: 'en',
}
```

Jeśli brak pliku — drykit używa domyślnych ścieżek (`src/components/**/*.tsx` itd.). `drykit init` generuje config z domyślnymi wartościami.

---

## 2. CLI — Komendy

### `npx drykit init`

Inicjalizacja projektu. Interaktywny wizard.

**Pytania:**
- Nazwa projektu
- Stack (React / Next.js / inne)
- CSS framework (Tailwind / inne / brak)
- TypeScript (tak / nie)
- AI: Claude Code / Kiro / oba
- Ścieżka komponentów (domyślnie `src/components`)

**Generuje:**
- `drykit.config.mjs`
- `registry.json` (pusty, ze schematem, w skonfigurowanej lokalizacji)
- `registry.schema.json`
- `.drykit/fingerprint.md`
- `.drykit/front.md`
- `.drykit/api.md`
- `AGENTS.md` (wspólna baza — Kiro czyta natywnie, zawsze)
- `CLAUDE.md` (jeśli wybrano Claude Code — lub dopisuje sekcję drykit do istniejącego)
- `.kiro/steering/drykit.md` (jeśli wybrano Kiro)
- `.kiro/steering/drykit-front.md` (jeśli wybrano Kiro)
- `.kiro/agents/drykit-*.json` (jeśli wybrano Kiro)
- `.husky/pre-commit` (lub dopisuje do istniejącego)
- Wpisy w `package.json` scripts
- Wpisy w `.gitignore` (jeśli brak)

**Nie generuje** przykładowych komponentów — pusty projekt.

**Jeśli CLAUDE.md już istnieje:** drykit dopisuje sekcję `## drykit` z regułami i `<!-- REGISTRY:START -->` blokiem. Nie nadpisuje istniejącej treści.

### `drykit scan`

Główna komenda. Czysty Node.js — zero wywołań AI.

**Przepływ:**
```
drykit scan
  ├── czyta drykit.config.mjs (ścieżki do skanowania)
  ├── skanuje pliki wg konfiguracji
  │   ├── AST: ekstrakcja props z interface/type XxxProps
  │   ├── AST: ekstrakcja wariantów z union type variant
  │   ├── Regex: ekstrakcja importów jako dependencies
  │   ├── Regex: ekstrakcja route handlers / tRPC procedures
  │   └── Regex: ekstrakcja Zod schemas
  │
  ├── → aktualizuje registry.json
  │
  ├── → generuje .drykit/fingerprint.md
  ├── → generuje .drykit/front.md
  ├── → generuje .drykit/api.md
  │
  ├── → aktualizuje CLAUDE.md (<!-- REGISTRY:START --> block)
  ├── → aktualizuje AGENTS.md (sekcja registry — Kiro czyta natywnie)
  └── → aktualizuje .kiro/steering/drykit-front.md (jeśli istnieje)
```

**Sekcja "Changed" w fingerprint** — źródło danych: `git log --oneline --since="7 days" -- <scan paths>`. Parsuje commity i mapuje na wpisy rejestru. Jeśli nie w git repo — pomija sekcję.

**Ekstrakcja per komponent (AST/regex, nie AI):**
- Nazwa (z nazwy pliku lub eksportu)
- Ścieżka
- Props (z `interface XxxProps` / `type XxxProps`)
- Warianty (z union type `variant: 'a' | 'b'`)
- Dependencies (z importów)
- Status (`beta` domyślnie)

**Ekstrakcja per route/endpoint (regex):**
- Ścieżka URL / nazwa procedury
- Metoda (GET/POST/mutation/query)
- Input/output type names

**Ekstrakcja per schema (regex):**
- Nazwa
- Pola (top-level keys)

### `drykit add <Name> [path]`

Dwa tryby. Oba to czysty Node.js.

**Plik nie istnieje** → scaffold + rejestracja:
```bash
drykit add ContactForm
# → Tworzy <componentsDir>/ContactForm.tsx
# → Rejestruje w registry.json
# → Tworzy doc stub
# → Aktualizuje fingerprint
```

Scaffold generuje minimalny boilerplate:
```tsx
// ContactForm.tsx — generated by drykit
interface ContactFormProps {
  // TODO: define props
}

export function ContactForm(props: ContactFormProps) {
  return <div>ContactForm</div>
}
```

Nie używa AI do scaffoldu — deterministyczny template. Jeśli TypeScript wyłączony w config — generuje .jsx bez typów.

**Plik istnieje** → tylko rejestracja:
```bash
drykit add Modal src/components/Modal.tsx
# → Parsuje plik (AST)
# → Rejestruje w registry.json
# → Tworzy doc stub jeśli brak
# → Aktualizuje fingerprint
```

W obu przypadkach — fuzzy match na istniejące wpisy:
```
⚠️  Similar component exists: Modal (src/components/Modal.tsx)
   Modal has variant 'confirmation' — consider using it instead.
   Continue anyway? (y/N)
```

Flaga `--force` pomija pytanie.

### `drykit check [--ci]`

Walidacja rejestru. Czysty Node.js.

- Pliki w skanowanych katalogach niezarejestrowane w `registry.json`
- Near-duplicate nazwy (Levenshtein + DRY-risk keywords z config)
- Brakujące doc stubs

**Zachowanie `--ci`:**
- Niezarejestrowany plik → exit code 1 + instrukcja `drykit add <Name> <path>`
- Near-duplicate → exit code 0 + WARNING na stderr (nie blokuje CI)
- Wszystko OK → exit code 0, cichy pass

### `drykit docs`

Generuj `docs/COMPONENTS.md` z `registry.json`. Aktualizuj `<!-- REGISTRY:START -->` block w CLAUDE.md.

---

## 3. Layered Fingerprint (pamięć AI)

Wszystkie pliki w `.drykit/` są auto-generowane przez `drykit scan`. Commitowane do git (nie gitignored) — AI potrzebuje je czytać.

### `.drykit/fingerprint.md` (~200 tokenów, zawsze ładowany)

```markdown
# my-app | React 19 + Next.js 15 + Tailwind 4
# Fingerprint: 2026-04-24T15:30:00Z (auto-generated by drykit scan)

## Stack
React 19, TanStack Router, tRPC, Zustand, Tailwind 4

## Routing
- Building UI/component → read .drykit/front.md
- Building API/endpoint → read .drykit/api.md

## Rules
- ALWAYS read the relevant file BEFORE creating anything
- If something exists — use it, don't create new
- New component? Check variants of existing ones first

## Changed (last 7 days)
04-24: +Modal/form, ~useAuth (refresh token)
04-23: +FormBuilder, +validatePhone
```

### `.drykit/front.md` (~500 tokenów, ładowany przy pracy z UI)

```markdown
# Frontend | 12 components, 3 hooks, 2 utils

## Components
Modal [primary|confirmation|form] → src/components/Modal.tsx
  props: open, variant, title, onClose, children
  deps: react
Button [primary|secondary|ghost] → src/components/Button.tsx
  props: variant, size, disabled, onClick, children
  deps: react
FormBuilder → src/components/FormBuilder.tsx
  props: schema, onSubmit, defaultValues
  deps: react-hook-form, zod

## Hooks
useAuth (depends: AuthContext) → src/hooks/useAuth.ts
useForm → src/hooks/useForm.ts

## Utils
validateEmail → src/utils/validators.ts
cn → src/utils/cn.ts

## Wiring
Modal → useAuth, Button
FormBuilder → Input, Textarea, Select, useForm, zodResolver
```

### `.drykit/api.md` (~400 tokenów, ładowany przy pracy z API)

```markdown
# API | 5 routers, 14 procedures

## tRPC Routers
users.profile (query) → input: none → output: User
users.update (mutation) → input: UpdateUserInput → output: User
projects.list (query) → input: { limit?, cursor? } → output: Project[]
projects.create (mutation) → input: CreateProjectInput → output: Project

## Schemas
User → src/schemas/user.ts (id, email, name, role)
CreateProjectInput → src/schemas/project.ts (title, description)
```

### Dlaczego trzy pliki, nie jeden

| Sytuacja | AI czyta | Tokenów |
|----------|----------|---------|
| Start sesji | `fingerprint.md` | ~200 |
| Buduje UI | + `front.md` | +500 |
| Buduje API | + `api.md` | +400 |
| Oba | + oba | +900 |

### .gitignore

`.drykit/` jest commitowany do git. AI musi mieć dostęp do tych plików. Merge conflicts są mało prawdopodobne bo pliki są auto-generowane — w razie konfliktu wystarczy `drykit scan` po merge.

---

## 4. AI Configuration — per platform

`drykit init` generuje pliki specyficzne dla wybranego AI. Każda platforma ma swój natywny format. `AGENTS.md` jest wspólną bazą — Kiro czyta go natywnie (zawsze), Claude Code nie (ale CLAUDE.md zawiera te same reguły).

### AGENTS.md (wspólny standard — Kiro czyta natywnie)

Kiro automatycznie ładuje `AGENTS.md` z root projektu — zawsze, bez konfiguracji. To najlepsza lokalizacja dla reguł wspólnych dla wszystkich AI.

```markdown
# Project: my-app

## drykit — Component Registry

Read `.drykit/fingerprint.md` at the start of every session.
Before creating any component, hook, or utility — check if it already exists.
If fingerprint routes you to `front.md` or `api.md` — read that file.

### Rules
- NEVER create a component without checking the registry
- If a component exists with variants — use a variant, don't create new
- If you must create new — run: drykit add <Name>
- After creating — verify registry.json was updated

### Component Library Status

<!-- REGISTRY:START -->
_(run `drykit docs` to populate)_
<!-- REGISTRY:END -->
```

`drykit scan` aktualizuje blok `<!-- REGISTRY:START -->` w AGENTS.md (tak samo jak w CLAUDE.md).

### Claude Code — CLAUDE.md

Claude Code czyta `CLAUDE.md` automatycznie. Drykit dopisuje sekcję:

```markdown
## drykit — Component Registry

Read `.drykit/fingerprint.md` at the start of every session.
Before creating any component, hook, or utility — check if it already exists.
If fingerprint routes you to `front.md` or `api.md` — read that file.

### Rules
- NEVER create a component without checking the registry
- If a component exists with variants — use a variant, don't create new
- If you must create new — run: drykit add <Name>
- After creating — verify registry.json was updated

### Component Library Status

<!-- REGISTRY:START -->
_(run `drykit docs` to populate)_
<!-- REGISTRY:END -->
```

### Claude Code — Agenci i Model Routing

Claude Code wspiera dwa mechanizmy agentów:

**1. Predefiniowane agenci (`.claude/agents/*.md`)** — wywoływane przez `@nazwa`. Nie mają pola `model` — używają modelu sesji.

**2. Instrukcje model routing w `CLAUDE.md`** — AI spawni subagentów z konkretnym modelem w trakcie sesji. To jest główny mechanizm oszczędzania tokenów.

Drykit dopisuje do `CLAUDE.md`:

```markdown
## drykit — Model Routing

When performing drykit-related tasks, delegate to cheaper models:

- Registry lookup, web search, file scan, duplicate check
  → spawn Agent with model: "haiku"
- Component scaffold, code generation, code review
  → spawn Agent with model: "sonnet"
- Architecture analysis, planning, complex refactoring
  → use main session context (don't delegate)

Example:
  Agent({ model: "haiku", prompt: "Read .drykit/front.md and check if a Modal component exists with a form variant" })
```

AI przeczyta to na starcie sesji i automatycznie deleguje proste zadania do Haiku zamiast robić je na Opus/Sonnet.

**Predefiniowane agenci** (opcjonalni, dla ręcznego wywołania przez `@nazwa`):

`.claude/agents/drykit-scanner.md`:
```markdown
---
name: drykit-scanner
---

You are a registry scanner. Your job:
1. Read drykit.config.mjs to find scan paths
2. Run `drykit scan` to update the registry
3. Report what changed: new entries, updated entries, potential duplicates
4. If duplicates found — suggest which to merge and how

Do NOT modify component files. Only run drykit CLI commands.
```

`.claude/agents/drykit-architect.md`:
```markdown
---
name: drykit-architect
---

You are an architecture advisor. Your job:
1. Read .drykit/fingerprint.md and the relevant detail file (front.md or api.md)
2. Analyze the current component structure
3. Identify: missing abstractions, over-duplicated patterns, unused components
4. Propose refactoring plan with specific file changes

Always check registry.json before suggesting new components.
```

### Kiro — Steering

`.kiro/steering/drykit.md` (always loaded):
```yaml
---
inclusion: always
name: drykit-registry
description: Component registry and DRY workflow rules
---

Read `.drykit/fingerprint.md` at the start of every session.
Before creating any component, hook, or utility — check if it already exists.
If fingerprint routes you to `front.md` or `api.md` — read that file.

Rules:
- NEVER create a component without checking the registry
- If a component exists with variants — use a variant, don't create new
- If you must create new — run: drykit add <Name>
- After creating — verify registry.json was updated
```

`.kiro/steering/drykit-front.md` (loaded only when editing components):
```yaml
---
inclusion: fileMatch
fileMatchPattern: "src/components/**/*.tsx"
name: drykit-frontend
description: Frontend component registry — read before creating UI
---

[auto-generated content from .drykit/front.md]
```

### Kiro — Agenci

Kiro wspiera pole `model` w agentach. Tu multi-model routing działa natywnie.

`.kiro/agents/drykit-scanner.json`:
```json
{
  "name": "drykit-scanner",
  "description": "Scan project and update component registry",
  "model": "claude-haiku-4-5",
  "tools": ["read", "write", "bash"],
  "prompt": "Run `drykit scan` and report changes. Do NOT modify component files directly."
}
```

`.kiro/agents/drykit-architect.json`:
```json
{
  "name": "drykit-architect",
  "description": "Analyze architecture and suggest improvements",
  "model": "claude-sonnet-4",
  "tools": ["read", "glob", "grep"],
  "resources": ["file://.drykit/**/*.md", "file://registry.json"],
  "prompt": "Read .drykit/fingerprint.md and relevant detail files. Analyze component structure. Identify duplications, missing abstractions, unused components. Propose specific refactoring steps."
}
```

### Podsumowanie: co gdzie działa

| Funkcja | Claude Code | Kiro |
|---------|-------------|------|
| Instrukcje (zawsze ładowane) | CLAUDE.md sekcja drykit | AGENTS.md (natywnie) + .kiro/steering/drykit.md |
| Kontekst frontend (on-demand) | AI czyta .drykit/front.md na żądanie | .kiro/steering/drykit-front.md (fileMatch) |
| Agenci (predefiniowani) | .claude/agents/ (model sesji) | .kiro/agents/ (model per agent) |
| Multi-model routing | Instrukcja w CLAUDE.md → AI spawni Agent({model:"haiku"}) | Natywnie (model w config agenta) |

---

## 5. Pre-commit Hook

`.husky/pre-commit`:

```bash
#!/usr/bin/env sh
set -e

STAGED=$(git diff --cached --name-only --diff-filter=ACMR \
  -- 'src/components/**' 'src/hooks/**' 'src/utils/**' || true)

if [ -z "$STAGED" ]; then
  exit 0
fi

npx drykit check --ci
```

Czysty Node.js. Zero tokenów AI. Zero API keys.

Zachowanie `--ci`:
- Niezarejestrowany plik → exit 1 + `drykit add <Name> <path>`
- Near-duplicate → exit 0 + WARNING na stderr
- Wszystko OK → exit 0, cichy pass

Ścieżki w hooku powinny być dynamiczne — czytane z `drykit.config.mjs`. Alternatywnie: `drykit check --ci` sam czyta config i wie gdzie szukać.

---

## 6. Registry Schema

Lokalizacja: konfigurowalna w `drykit.config.mjs` (domyślnie `src/registry.json`).

```json
{
  "$schema": "./registry.schema.json",
  "version": "1",
  "generatedAt": "2026-04-24T15:48:45.036Z",
  "components": [
    {
      "name": "Modal",
      "path": "src/components/Modal.tsx",
      "variants": ["primary", "confirmation", "form"],
      "props": {
        "open": "boolean",
        "variant": "'primary' | 'confirmation' | 'form'",
        "title": "string",
        "onClose": "() => void",
        "children": "React.ReactNode"
      },
      "usage": "import { Modal } from '@/components/Modal';",
      "dependencies": ["react"],
      "dateCreated": "2026-04-24",
      "lastModified": "2026-04-24",
      "status": "beta"
    }
  ],
  "hooks": [],
  "utils": [],
  "routes": [],
  "schemas": []
}
```

**Wersjonowanie:** pole `version` w registry. Gdy schemat się zmieni:
- `drykit scan` sprawdza wersję
- Jeśli starsza — automatyczna migracja (dodanie nowych pól z domyślnymi wartościami)
- Migracja jest addytywna (dodaje pola) — nigdy destruktywna (nie usuwa)
- Backup starego pliku jako `registry.json.bak` przed migracją

---

## 7. Przepływ — Typowy Scenariusz

Developer pisze: *"Stwórz modal z formularzem kontaktowym"*

```
1. AI czyta CLAUDE.md / AGENTS.md / .kiro/steering/drykit.md (zawsze)
   → widzi regułę: "przeczytaj fingerprint"

2. AI czyta .drykit/fingerprint.md (~200 tokenów)
   → widzi routing: "UI → czytaj .drykit/front.md"

3. AI czyta .drykit/front.md (~500 tokenów)
   → widzi: Modal [primary|confirmation|form]
   → widzi: FormBuilder w src/components/

4. AI odpowiada:
   "Modal with variant 'form' and FormBuilder already exist.
    I'll use <Modal variant="form"> with FormBuilder inside.
    Want a new dedicated component instead?"

5a. Developer: "ok, use existing"
    → AI pisze kod używając istniejących komponentów
    → Zero nowych plików

5b. Developer: "need a new one"
    → AI tworzy ContactFormModal.tsx
    → Uruchamia: drykit add ContactFormModal
    → Registry + fingerprint zaktualizowane
    → Pre-commit weryfikuje rejestrację
```

---

## 8. Struktura plików po `drykit init`

```
project/
├── drykit.config.mjs                 # konfiguracja ścieżek
├── AGENTS.md                         # wspólna baza (Kiro czyta natywnie)
├── CLAUDE.md                         # Claude Code (sekcja drykit dopisana)
├── .claude/
│   └── agents/
│       ├── drykit-scanner.md         # prompt: uruchom drykit scan
│       └── drykit-architect.md       # prompt: analiza architektury
├── .kiro/
│   ├── steering/
│   │   ├── drykit.md                 # always — reguły rejestru
│   │   └── drykit-front.md           # fileMatch — frontend context
│   └── agents/
│       ├── drykit-scanner.json       # model: haiku
│       └── drykit-architect.json     # model: sonnet
├── .drykit/
│   ├── fingerprint.md                # routing + stack + changed
│   ├── front.md                      # komponenty, hooks, UI
│   └── api.md                        # endpointy, schemas
├── .husky/
│   └── pre-commit                    # blokada niezarejestrowanych
├── src/
│   ├── registry.json                 # source of truth
│   ├── registry.schema.json          # JSON schema
│   ├── components/
│   ├── hooks/
│   └── utils/
├── docs/
│   ├── COMPONENTS.md                 # auto-generated
│   └── components/                   # doc stubs per component
│       ├── Modal.md
│       └── Button.md
└── package.json
```

Zmiany vs v1:
- Dodano `AGENTS.md` jako wspólną bazę (Kiro czyta natywnie)
- Dodano `drykit.config.mjs`
- Doc stubs przeniesione do `docs/components/` (jedna lokalizacja docs)
- Zredukowano liczbę agentów (scanner + architect, nie 4-5)

---

## 9. Ograniczenia i Decyzje

- **React only** na start. Multi-framework (Vue, Svelte) w przyszłości.
- **Cały pipeline to czysty Node.js.** Zero wywołań AI, zero tokenów, zero API keys. Drykit działa offline.
- **Agenci AI to opcjonalny layer.** Pomagają w pracy, ale drykit funkcjonuje w pełni bez nich.
- **Multi-model routing:** natywny w Kiro (model per agent), ręczny w Claude Code (user wybiera model sesji). Drykit dokumentuje rekomendacje w README.
- **Fingerprint jest read-only dla AI.** Modyfikowany tylko przez `drykit scan`.
- **Registry jest source of truth.** Fingerprint, AGENTS.md, CLAUDE.md, steering — generowane z registry.json.
- **Pre-commit hook to czysty Node.js.** Zero tokenów, zero kosztów.
- **`.drykit/` commitowany do git.** AI potrzebuje dostępu. Merge conflicts rozwiązywane przez `drykit scan`.
- **Język domyślny: angielski.** Konfigurowalny w `drykit.config.mjs` (`lang: 'pl'`).
- **Brak komendy `drykit update`.** Aktualizacja przez `npm update drykit` / `npx drykit@latest init --update`.

---

## 10. Dystrybucja

- Publikacja na npm jako `drykit`
- Instalacja: `npx drykit init` (jednorazowa)
- Globalna: `npm install -g drykit`
- Aktualizacja: `npm update -g drykit` lub `npx drykit@latest`
- Licencja: MIT

---

## 11. Edge Cases

- **Scan znajduje 0 komponentów:** generuje puste sekcje w fingerprint, nie błąd
- **Registry.json ręcznie uszkodzony:** `drykit scan` nadpisuje go od zera (z ostrzeżeniem)
- **Plik komponentu nie parsuje się:** loguje warning, pomija plik, kontynuuje scan
- **Fingerprint przekracza budżet tokenów:** `drykit scan` loguje warning z liczbą tokenów. Dla dużych projektów — front.md może być podzielony na front-components.md, front-hooks.md (konfigurowalny próg w config)
- **Dwóch developerów robi scan jednocześnie:** registry.json to JSON — git merge rozwiąże konflikty. `drykit scan` po merge naprawi niespójności
- **Projekt bez git:** pre-commit hook nie działa, sekcja "Changed" w fingerprint pusta. Reszta działa normalnie
- **Monorepo:** każdy package ma swój `drykit.config.mjs` i `registry.json`. Fingerprint per package
