# drykit Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `drykit` — an npm CLI tool that scans React projects, builds a component registry, generates AI-optimized fingerprint files, and configures Claude Code + Kiro to prevent duplicate components.

**Architecture:** Node.js CLI with ESM modules. Entry point `bin/drykit.mjs` dispatches to command modules in `src/commands/`. Core logic (config loading, registry operations, fingerprint generation, file extraction) lives in `src/core/`. Templates for generated files (AGENTS.md, CLAUDE.md, steering, agents) in `src/templates/`.

**Tech Stack:** Node.js 20+, ESM, no build step, no external dependencies beyond `glob` for file matching and `prompts` for interactive wizard.

**Spec:** `docs/superpowers/specs/2026-04-24-drykit-design.md`

---

## File Structure

```
drykit/
├── package.json
├── bin/
│   └── drykit.mjs              # CLI entry point, arg parsing, command dispatch
├── src/
│   ├── commands/
│   │   ├── init.mjs            # npx drykit init — interactive wizard
│   │   ├── scan.mjs            # drykit scan — scan + registry + fingerprint
│   │   ├── add.mjs             # drykit add — scaffold/register component
│   │   ├── check.mjs           # drykit check — validate registry
│   │   └── docs.mjs            # drykit docs — generate COMPONENTS.md
│   ├── core/
│   │   ├── config.mjs          # Load/merge drykit.config.mjs with defaults
│   │   ├── registry.mjs        # CRUD operations on registry.json
│   │   ├── extractor.mjs       # AST/regex extraction: props, variants, deps
│   │   ├── fingerprint.mjs     # Generate .drykit/*.md files
│   │   ├── duplicates.mjs      # Levenshtein + DRY-risk duplicate detection
│   │   ├── changelog.mjs       # Git log parsing for "Changed" section
│   │   └── updater.mjs         # Update CLAUDE.md, AGENTS.md, steering blocks
│   └── templates/
│       ├── agents-md.mjs       # AGENTS.md template
│       ├── claude-md.mjs       # CLAUDE.md drykit section template
│       ├── kiro-steering.mjs   # .kiro/steering/*.md templates
│       ├── kiro-agents.mjs     # .kiro/agents/*.json templates
│       ├── claude-agents.mjs   # .claude/agents/*.md templates
│       ├── config.mjs          # drykit.config.mjs template
│       ├── registry.mjs        # Empty registry.json template
│       ├── schema.mjs          # registry.schema.json template
│       ├── pre-commit.mjs      # .husky/pre-commit template
│       ├── component.mjs       # Component scaffold template (.tsx/.jsx)
│       └── doc-stub.mjs        # Doc stub template per component
└── tests/
    ├── config.test.mjs
    ├── extractor.test.mjs
    ├── registry.test.mjs
    ├── duplicates.test.mjs
    ├── fingerprint.test.mjs
    ├── changelog.test.mjs
    ├── commands/
    │   ├── init.test.mjs
    │   ├── scan.test.mjs
    │   ├── add.test.mjs
    │   └── check.test.mjs
    └── fixtures/
        ├── sample-component.tsx
        ├── sample-hook.ts
        ├── sample-route.ts
        └── sample-schema.ts
```

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `bin/drykit.mjs`
- Create: `.gitignore`
- Create: `LICENSE`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "drykit",
  "version": "0.1.0",
  "description": "CLI tool that prevents AI from creating duplicate components in React projects",
  "type": "module",
  "bin": {
    "drykit": "./bin/drykit.mjs"
  },
  "files": [
    "bin/",
    "src/"
  ],
  "scripts": {
    "test": "node --test tests/**/*.test.mjs",
    "test:watch": "node --test --watch tests/**/*.test.mjs"
  },
  "keywords": [
    "cli",
    "react",
    "components",
    "registry",
    "dry",
    "ai",
    "claude-code",
    "kiro",
    "duplicate-detection"
  ],
  "license": "MIT",
  "engines": {
    "node": ">=20.0.0"
  },
  "dependencies": {
    "glob": "^11.0.0",
    "prompts": "^2.4.2"
  }
}
```

- [ ] **Step 2: Create minimal `bin/drykit.mjs` stub**

```js
#!/usr/bin/env node
const [,, command, ...args] = process.argv;

const COMMANDS = ['init', 'scan', 'add', 'check', 'docs'];

if (!command || command === '--help' || command === '-h') {
  console.log(`drykit — prevent AI from creating duplicate components

Usage: drykit <command> [options]

Commands:
  init          Initialize drykit in current project
  scan          Scan project and update registry + fingerprint
  add <Name>    Add/register a component
  check [--ci]  Validate registry (unregistered files, duplicates)
  docs          Generate COMPONENTS.md from registry`);
  process.exit(0);
}

if (!COMMANDS.includes(command)) {
  console.error(`Unknown command: ${command}\nRun drykit --help for usage.`);
  process.exit(1);
}

const mod = await import(`../src/commands/${command}.mjs`);
await mod.default(args);
```

- [ ] **Step 3: Create `.gitignore`**

```
node_modules/
*.tgz
.DS_Store
```

- [ ] **Step 4: Run `npm install` to generate lockfile**

Run: `npm install`
Expected: `node_modules/` created, `package-lock.json` generated.

- [ ] **Step 4b: Make bin executable (Unix)**

Run: `chmod +x bin/drykit.mjs` (skip on Windows)

- [ ] **Step 5: Verify bin entry works**

Run: `node bin/drykit.mjs --help`
Expected: Help text printed, exit 0.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json bin/drykit.mjs .gitignore LICENSE
git commit -m "feat: scaffold drykit CLI project"
```

---

## Task 2: Core — Config Loader

**Files:**
- Create: `src/core/config.mjs`
- Create: `tests/config.test.mjs`

- [ ] **Step 1: Write failing test**

```js
// tests/config.test.mjs
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadConfig, DEFAULT_CONFIG } from '../src/core/config.mjs';

const TMP = path.join(import.meta.dirname, '__tmp_config');

describe('loadConfig', () => {
  before(() => fs.mkdirSync(TMP, { recursive: true }));
  after(() => fs.rmSync(TMP, { recursive: true, force: true }));

  it('returns defaults when no config file exists', async () => {
    const cfg = await loadConfig(TMP);
    assert.deepStrictEqual(cfg.scan.components, DEFAULT_CONFIG.scan.components);
    assert.equal(cfg.registry, DEFAULT_CONFIG.registry);
    assert.equal(cfg.lang, 'en');
  });

  it('merges user config over defaults', async () => {
    const cfgPath = path.join(TMP, 'drykit.config.mjs');
    fs.writeFileSync(cfgPath, `export default { registry: 'lib/reg.json', lang: 'pl' };\n`);
    const cfg = await loadConfig(TMP);
    assert.equal(cfg.registry, 'lib/reg.json');
    assert.equal(cfg.lang, 'pl');
    // defaults preserved for unset keys
    assert.deepStrictEqual(cfg.scan.components, DEFAULT_CONFIG.scan.components);
    fs.unlinkSync(cfgPath);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/config.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/core/config.mjs`**

```js
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const DEFAULT_CONFIG = {
  scan: {
    components: ['src/components/**/*.tsx', 'components/**/*.tsx'],
    hooks: ['src/hooks/**/*.ts', 'hooks/**/*.ts'],
    utils: ['src/utils/**/*.ts', 'lib/**/*.ts'],
    routes: ['src/routes/**/*.ts', 'src/app/api/**/*.ts'],
    schemas: ['src/schemas/**/*.ts', 'src/types/**/*.ts'],
  },
  registry: 'src/registry.json',
  docs: 'docs/components',
  dryRisk: ['Modal', 'Form', 'Card', 'Button', 'Dialog', 'Drawer',
            'Toast', 'Dropdown', 'Select', 'Input', 'Table'],
  lang: 'en',
  projectName: '',
  stack: '',
};

function deepMerge(target, source) {
  const out = { ...target };
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])
        && target[key] && typeof target[key] === 'object' && !Array.isArray(target[key])) {
      out[key] = deepMerge(target[key], source[key]);
    } else {
      out[key] = source[key];
    }
  }
  return out;
}

export async function loadConfig(root = process.cwd()) {
  const cfgPath = path.join(root, 'drykit.config.mjs');
  if (!fs.existsSync(cfgPath)) return { ...DEFAULT_CONFIG };
  const mod = await import(pathToFileURL(cfgPath).href);
  const user = mod.default || mod;
  return deepMerge(DEFAULT_CONFIG, user);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/config.test.mjs`
Expected: 2 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/config.mjs tests/config.test.mjs
git commit -m "feat: config loader with defaults and deep merge"
```

---

## Task 3: Core — Extractor (AST/regex)

**Files:**
- Create: `src/core/extractor.mjs`
- Create: `tests/extractor.test.mjs`
- Create: `tests/fixtures/sample-component.tsx`
- Create: `tests/fixtures/sample-hook.ts`
- Create: `tests/fixtures/sample-route.ts`
- Create: `tests/fixtures/sample-schema.ts`

- [ ] **Step 1: Create test fixtures**

`tests/fixtures/sample-component.tsx`:
```tsx
import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/utils/cn';

interface ModalProps {
  open: boolean;
  variant: 'primary' | 'confirmation' | 'form';
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

export function Modal({ open, variant = 'primary', title, onClose, children }: ModalProps) {
  if (!open) return null;
  return <div className={cn('modal', variant)}>{children}</div>;
}
```

`tests/fixtures/sample-hook.ts`:
```ts
import { useState, useEffect } from 'react';
import { AuthContext } from '@/contexts/AuthContext';

export function useAuth() {
  const [user, setUser] = useState(null);
  return { user, setUser };
}
```

`tests/fixtures/sample-route.ts`:
```ts
import { z } from 'zod';

export const usersRouter = {
  profile: {
    method: 'query',
    input: z.object({}),
    output: z.object({ id: z.string(), name: z.string() }),
  },
  update: {
    method: 'mutation',
    input: z.object({ name: z.string() }),
    output: z.object({ id: z.string(), name: z.string() }),
  },
};
```

`tests/fixtures/sample-schema.ts`:
```ts
import { z } from 'zod';

export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  role: z.enum(['admin', 'user']),
});

export type User = z.infer<typeof UserSchema>;
```

- [ ] **Step 2: Write failing tests**

```js
// tests/extractor.test.mjs
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { extractComponent, extractHook, extractRoute, extractSchema } from '../src/core/extractor.mjs';

const FIX = path.join(import.meta.dirname, 'fixtures');

describe('extractComponent', () => {
  it('extracts name, props, variants, deps from .tsx', () => {
    const result = extractComponent(path.join(FIX, 'sample-component.tsx'));
    assert.equal(result.name, 'Modal');
    assert.deepStrictEqual(result.variants, ['primary', 'confirmation', 'form']);
    assert.equal(result.props.open, 'boolean');
    assert.equal(result.props.variant, "'primary' | 'confirmation' | 'form'");
    assert.ok(result.dependencies.includes('react'));
    assert.ok(result.dependencies.includes('@/hooks/useAuth'));
  });
});

describe('extractHook', () => {
  it('extracts name and deps from hook file', () => {
    const result = extractHook(path.join(FIX, 'sample-hook.ts'));
    assert.equal(result.name, 'useAuth');
    assert.ok(result.dependencies.includes('react'));
  });
});

describe('extractSchema', () => {
  it('extracts schema name and fields', () => {
    const results = extractSchema(path.join(FIX, 'sample-schema.ts'));
    assert.ok(results.length >= 1);
    assert.equal(results[0].name, 'UserSchema');
    assert.ok(results[0].fields.includes('id'));
    assert.ok(results[0].fields.includes('email'));
  });
});

describe('extractRoute', () => {
  it('extracts route procedures from fixture', () => {
    const result = extractRoute(path.join(FIX, 'sample-route.ts'));
    assert.ok(result.routes.length >= 2);
    assert.ok(result.routes.some(r => r.name === 'profile' && r.method === 'query'));
    assert.ok(result.routes.some(r => r.name === 'update' && r.method === 'mutation'));
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `node --test tests/extractor.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement `src/core/extractor.mjs`**

```js
import fs from 'node:fs';
import path from 'node:path';

function extractImports(src) {
  const deps = [];
  const re = /^\s*import\s+(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]/gm;
  let m;
  while ((m = re.exec(src))) {
    if (m[1].endsWith('.css') || m[1].endsWith('.scss')) continue;
    deps.push(m[1]);
  }
  return [...new Set(deps)];
}

function extractPropsInterface(src, componentName) {
  const re = new RegExp(
    `(?:interface|type)\\s+${componentName}Props\\s*(?:=\\s*)?\\{([^}]+)\\}`,
    's'
  );
  const m = re.exec(src);
  if (!m) return {};
  const props = {};
  const body = m[1];
  for (const line of body.split('\n')) {
    const pm = line.match(/^\s*(\w+)\s*[?]?\s*:\s*(.+?)\s*;?\s*$/);
    if (pm) props[pm[1]] = pm[2].replace(/\s+/g, ' ').trim();
  }
  return props;
}

function extractVariants(props) {
  const variantType = props.variant;
  if (!variantType) return [];
  const matches = variantType.match(/'([^']+)'/g);
  if (!matches) return [];
  return matches.map(m => m.replace(/'/g, ''));
}

function nameFromFile(filePath) {
  return path.basename(filePath).replace(/\.(tsx?|jsx?)$/, '');
}

function nameFromExport(src) {
  const m = src.match(/export\s+(?:default\s+)?(?:function|const|class)\s+(\w+)/);
  return m ? m[1] : null;
}

export function extractComponent(filePath) {
  const src = fs.readFileSync(filePath, 'utf8');
  const name = nameFromExport(src) || nameFromFile(filePath);
  const props = extractPropsInterface(src, name);
  return {
    name,
    path: filePath,
    props,
    variants: extractVariants(props),
    dependencies: extractImports(src),
  };
}

export function extractHook(filePath) {
  const src = fs.readFileSync(filePath, 'utf8');
  const name = nameFromExport(src) || nameFromFile(filePath);
  return {
    name,
    path: filePath,
    dependencies: extractImports(src),
  };
}

export function extractRoute(filePath) {
  const src = fs.readFileSync(filePath, 'utf8');
  const routes = [];
  // tRPC-style: key: publicProcedure.query(...) or key: { method: 'query' }
  const procRe = /(\w+)\s*:\s*(?:publicProcedure|protectedProcedure|adminProcedure)\s*\.\s*(query|mutation)/g;
  let m;
  while ((m = procRe.exec(src))) {
    routes.push({ name: m[1], method: m[2] });
  }
  // Fallback: key: { method: 'query' } style
  const objRe = /(\w+)\s*:\s*\{[^}]*?method\s*:\s*['"](\w+)['"]/gs;
  while ((m = objRe.exec(src))) {
    if (!routes.some(r => r.name === m[1])) {
      routes.push({ name: m[1], method: m[2] });
    }
  }
  // Next.js-style: export async function GET/POST
  const handlerRe = /export\s+(?:async\s+)?function\s+(GET|POST|PUT|DELETE|PATCH)/g;
  while ((m = handlerRe.exec(src))) {
    routes.push({ name: path.basename(path.dirname(filePath)), method: m[1].toLowerCase() });
  }
  return { path: filePath, routes, dependencies: extractImports(src) };
}

export function extractSchema(filePath) {
  const src = fs.readFileSync(filePath, 'utf8');
  const schemas = [];
  const re = /export\s+const\s+(\w+Schema)\s*=\s*z\.object\(\{([^}]+)\}\)/gs;
  let m;
  while ((m = re.exec(src))) {
    const fields = [];
    const fieldRe = /(\w+)\s*:/g;
    let fm;
    while ((fm = fieldRe.exec(m[2]))) fields.push(fm[1]);
    schemas.push({ name: m[1], path: filePath, fields, dependencies: extractImports(src) });
  }
  return schemas;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `node --test tests/extractor.test.mjs`
Expected: 3 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/core/extractor.mjs tests/extractor.test.mjs tests/fixtures/
git commit -m "feat: AST/regex extractor for components, hooks, routes, schemas"
```

---

## Task 4: Core — Registry CRUD

**Files:**
- Create: `src/core/registry.mjs`
- Create: `tests/registry.test.mjs`

- [ ] **Step 1: Write failing tests**

```js
// tests/registry.test.mjs
import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadRegistry, saveRegistry, upsertEntry, findEntry, removeEntry } from '../src/core/registry.mjs';

const TMP = path.join(import.meta.dirname, '__tmp_registry');
const REG = path.join(TMP, 'registry.json');

const EMPTY = { version: '1', generatedAt: '', components: [], hooks: [], utils: [], routes: [], schemas: [] };

describe('registry', () => {
  before(() => fs.mkdirSync(TMP, { recursive: true }));
  after(() => fs.rmSync(TMP, { recursive: true, force: true }));
  beforeEach(() => saveRegistry(REG, EMPTY));

  it('loads and saves registry', () => {
    const reg = loadRegistry(REG);
    assert.equal(reg.version, '1');
    assert.deepStrictEqual(reg.components, []);
  });

  it('upserts a new component entry', () => {
    const reg = loadRegistry(REG);
    const entry = { name: 'Modal', path: 'src/components/Modal.tsx', variants: ['primary'], props: { open: 'boolean' }, dependencies: ['react'] };
    upsertEntry(reg, 'components', entry);
    assert.equal(reg.components.length, 1);
    assert.equal(reg.components[0].name, 'Modal');
  });

  it('updates existing entry by name+path', () => {
    const reg = loadRegistry(REG);
    upsertEntry(reg, 'components', { name: 'Modal', path: 'src/Modal.tsx', variants: ['a'], props: {}, dependencies: [] });
    upsertEntry(reg, 'components', { name: 'Modal', path: 'src/Modal.tsx', variants: ['a', 'b'], props: { x: 'string' }, dependencies: [] });
    assert.equal(reg.components.length, 1);
    assert.deepStrictEqual(reg.components[0].variants, ['a', 'b']);
  });

  it('finds entry by name (case-insensitive)', () => {
    const reg = loadRegistry(REG);
    upsertEntry(reg, 'components', { name: 'Modal', path: 'src/Modal.tsx', variants: [], props: {}, dependencies: [] });
    saveRegistry(REG, reg);
    const found = findEntry(loadRegistry(REG), 'modal');
    assert.equal(found.name, 'Modal');
  });

  it('removes entry by name', () => {
    const reg = loadRegistry(REG);
    upsertEntry(reg, 'components', { name: 'Modal', path: 'src/Modal.tsx', variants: [], props: {}, dependencies: [] });
    removeEntry(reg, 'components', 'Modal');
    assert.equal(reg.components.length, 0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/registry.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/core/registry.mjs`**

```js
import fs from 'node:fs';

const EMPTY_REGISTRY = {
  version: '1',
  generatedAt: '',
  components: [],
  hooks: [],
  utils: [],
  routes: [],
  schemas: [],
};

export function loadRegistry(filePath) {
  if (!fs.existsSync(filePath)) return structuredClone(EMPTY_REGISTRY);
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

export function saveRegistry(filePath, reg) {
  reg.generatedAt = new Date().toISOString();
  fs.writeFileSync(filePath, JSON.stringify(reg, null, 2) + '\n');
}

export function upsertEntry(reg, kind, entry) {
  const list = reg[kind];
  if (!list) throw new Error(`Unknown kind: ${kind}`);
  const idx = list.findIndex(e => e.name === entry.name && e.path === entry.path);
  const now = new Date().toISOString().slice(0, 10);
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...entry, lastModified: now };
  } else {
    list.push({ ...entry, dateCreated: now, lastModified: now, status: 'beta' });
  }
}

export function findEntry(reg, query) {
  const q = query.toLowerCase();
  for (const kind of ['components', 'hooks', 'utils', 'routes', 'schemas']) {
    const found = reg[kind].find(e =>
      e.name.toLowerCase().includes(q) || (e.path && e.path.toLowerCase().includes(q))
    );
    if (found) return found;
  }
  return null;
}

export function removeEntry(reg, kind, name) {
  reg[kind] = reg[kind].filter(e => e.name !== name);
}

export function createEmptyRegistry() {
  return structuredClone(EMPTY_REGISTRY);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/registry.test.mjs`
Expected: 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/registry.mjs tests/registry.test.mjs
git commit -m "feat: registry CRUD — load, save, upsert, find, remove"
```

---

## Task 5: Core — Duplicate Detection

**Files:**
- Create: `src/core/duplicates.mjs`
- Create: `tests/duplicates.test.mjs`

- [ ] **Step 1: Write failing tests**

```js
// tests/duplicates.test.mjs
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { levenshtein, findDuplicates, findUnregistered } from '../src/core/duplicates.mjs';

describe('levenshtein', () => {
  it('returns 0 for identical strings', () => {
    assert.equal(levenshtein('Modal', 'Modal'), 0);
  });
  it('returns correct distance', () => {
    assert.equal(levenshtein('Modal', 'Model'), 1);
    assert.equal(levenshtein('ConfirmModal', 'Modal'), 7);
  });
});

describe('findDuplicates', () => {
  const entries = [
    { name: 'Modal', path: 'src/components/Modal.tsx', variants: ['primary', 'confirmation'] },
    { name: 'ConfirmModal', path: 'src/components/ConfirmModal.tsx', variants: [] },
    { name: 'Button', path: 'src/components/Button.tsx', variants: [] },
  ];

  it('detects near-duplicate names', () => {
    const dupes = findDuplicates(entries, ['Modal', 'Form', 'Button']);
    assert.ok(dupes.length >= 1);
    assert.ok(dupes.some(d => d.a === 'Modal' && d.b === 'ConfirmModal'));
  });

  it('does not flag unrelated names', () => {
    const dupes = findDuplicates(entries, ['Modal']);
    assert.ok(!dupes.some(d => d.a === 'Button' || d.b === 'Button'));
  });
});

describe('findUnregistered', () => {
  it('returns files not in registry', () => {
    const files = ['src/components/Modal.tsx', 'src/components/Foo.tsx'];
    const registered = [{ path: 'src/components/Modal.tsx' }];
    const unreg = findUnregistered(files, registered);
    assert.deepStrictEqual(unreg, ['src/components/Foo.tsx']);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/duplicates.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/core/duplicates.mjs`**

```js
export function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function containsDryRisk(name, keywords) {
  const lower = name.toLowerCase();
  return keywords.some(k => lower.includes(k.toLowerCase()));
}

export function findDuplicates(entries, dryRiskKeywords = []) {
  const dupes = [];
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const a = entries[i].name;
      const b = entries[j].name;
      const dist = levenshtein(a.toLowerCase(), b.toLowerCase());
      const maxLen = Math.max(a.length, b.length);
      const ratio = dist / maxLen;
      // Flag if: one name contains the other, or Levenshtein ratio < 0.4, or both contain a DRY-risk keyword
      const oneContainsOther = a.toLowerCase().includes(b.toLowerCase()) || b.toLowerCase().includes(a.toLowerCase());
      const bothDryRisk = containsDryRisk(a, dryRiskKeywords) && containsDryRisk(b, dryRiskKeywords);
      if (oneContainsOther || (ratio < 0.4 && bothDryRisk)) {
        const existing = entries[i].variants?.length ? entries[i] : entries[j];
        dupes.push({
          a: entries[i].name,
          b: entries[j].name,
          distance: dist,
          suggestion: existing.variants?.length
            ? `${existing.name} has variants [${existing.variants.join(', ')}] — consider adding a variant instead`
            : `Consider merging into one component with variants`,
        });
      }
    }
  }
  return dupes;
}

export function findUnregistered(filePaths, registeredEntries) {
  const registered = new Set(registeredEntries.map(e => e.path));
  return filePaths.filter(f => !registered.has(f));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/duplicates.test.mjs`
Expected: 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/duplicates.mjs tests/duplicates.test.mjs
git commit -m "feat: duplicate detection — Levenshtein + DRY-risk keywords"
```

---

## Task 6: Core — Fingerprint Generator

**Files:**
- Create: `src/core/fingerprint.mjs`
- Create: `tests/fingerprint.test.mjs`

- [ ] **Step 1: Write failing tests**

```js
// tests/fingerprint.test.mjs
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateFingerprint, generateFrontMd, generateApiMd } from '../src/core/fingerprint.mjs';

const sampleRegistry = {
  version: '1',
  generatedAt: '2026-04-24T15:00:00Z',
  components: [
    { name: 'Modal', path: 'src/components/Modal.tsx', variants: ['primary', 'form'], props: { open: 'boolean', variant: "'primary' | 'form'" }, dependencies: ['react', '@/hooks/useAuth'], status: 'beta' },
    { name: 'Button', path: 'src/components/Button.tsx', variants: ['primary', 'ghost'], props: { variant: "'primary' | 'ghost'" }, dependencies: ['react'], status: 'stable' },
  ],
  hooks: [
    { name: 'useAuth', path: 'src/hooks/useAuth.ts', dependencies: ['react'] },
  ],
  utils: [
    { name: 'cn', path: 'src/utils/cn.ts', dependencies: [] },
  ],
  routes: [
    { name: 'users', path: 'src/routes/users.ts', routes: [{ name: 'profile', method: 'query' }, { name: 'update', method: 'mutation' }], dependencies: ['zod'] },
  ],
  schemas: [
    { name: 'UserSchema', path: 'src/schemas/user.ts', fields: ['id', 'email', 'name'], dependencies: ['zod'] },
  ],
};

const sampleConfig = {
  scan: { components: ['src/components/**/*.tsx'], hooks: ['src/hooks/**/*.ts'], utils: ['src/utils/**/*.ts'], routes: ['src/routes/**/*.ts'], schemas: ['src/schemas/**/*.ts'] },
  registry: 'src/registry.json',
  lang: 'en',
};

describe('generateFingerprint', () => {
  it('produces compact markdown with routing section', () => {
    const md = generateFingerprint(sampleRegistry, sampleConfig, 'my-app', 'React 19 + Tailwind 4', []);
    assert.ok(md.includes('my-app'));
    assert.ok(md.includes('Routing'));
    assert.ok(md.includes('front.md'));
    assert.ok(md.includes('api.md'));
    assert.ok(md.includes('Rules'));
  });
});

describe('generateFrontMd', () => {
  it('lists components, hooks, utils with props and variants', () => {
    const md = generateFrontMd(sampleRegistry);
    assert.ok(md.includes('Modal [primary|form]'));
    assert.ok(md.includes('Button [primary|ghost]'));
    assert.ok(md.includes('useAuth'));
    assert.ok(md.includes('cn'));
  });
});

describe('generateApiMd', () => {
  it('lists routes and schemas', () => {
    const md = generateApiMd(sampleRegistry);
    assert.ok(md.includes('profile (query)'));
    assert.ok(md.includes('update (mutation)'));
    assert.ok(md.includes('UserSchema'));
    assert.ok(md.includes('id, email, name'));
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/fingerprint.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/core/fingerprint.mjs`**

```js
export function generateFingerprint(registry, config, projectName, stack, changedLines) {
  const ts = new Date().toISOString();
  const compCount = registry.components.length;
  const hookCount = registry.hooks.length;
  const utilCount = registry.utils.length;
  const routeCount = registry.routes.reduce((s, r) => s + (r.routes?.length || 0), 0);
  const schemaCount = registry.schemas.length;

  let md = `# ${projectName} | ${stack}
# Fingerprint: ${ts} (auto-generated by drykit scan)

## Stats
${compCount} components, ${hookCount} hooks, ${utilCount} utils, ${routeCount} routes, ${schemaCount} schemas

## Routing
- Building UI/component → read .drykit/front.md
- Building API/endpoint → read .drykit/api.md

## Rules
- ALWAYS read the relevant file BEFORE creating anything
- If something exists — use it, don't create new
- New component? Check variants of existing ones first
`;

  if (changedLines && changedLines.length > 0) {
    md += `\n## Changed (last 7 days)\n`;
    for (const line of changedLines) {
      md += `${line}\n`;
    }
  }

  return md;
}

export function generateFrontMd(registry) {
  const compCount = registry.components.length;
  const hookCount = registry.hooks.length;
  const utilCount = registry.utils.length;

  let md = `# Frontend | ${compCount} components, ${hookCount} hooks, ${utilCount} utils\n`;

  if (compCount > 0) {
    md += `\n## Components\n`;
    for (const c of registry.components) {
      const vars = c.variants?.length ? ` [${c.variants.join('|')}]` : '';
      md += `${c.name}${vars} → ${c.path}\n`;
      if (c.props && Object.keys(c.props).length > 0) {
        md += `  props: ${Object.keys(c.props).join(', ')}\n`;
      }
      if (c.dependencies?.length > 0) {
        md += `  deps: ${c.dependencies.join(', ')}\n`;
      }
    }
  }

  if (hookCount > 0) {
    md += `\n## Hooks\n`;
    for (const h of registry.hooks) {
      const deps = h.dependencies?.length ? ` (deps: ${h.dependencies.join(', ')})` : '';
      md += `${h.name}${deps} → ${h.path}\n`;
    }
  }

  if (utilCount > 0) {
    md += `\n## Utils\n`;
    for (const u of registry.utils) {
      md += `${u.name} → ${u.path}\n`;
    }
  }

  // Wiring: components that depend on other registered items
  const allNames = new Set([
    ...registry.components.map(c => c.name),
    ...registry.hooks.map(h => h.name),
    ...registry.utils.map(u => u.name),
  ]);
  const wirings = [];
  for (const c of registry.components) {
    const internal = (c.dependencies || [])
      .map(d => { const parts = d.split('/'); return parts[parts.length - 1]; })
      .filter(d => allNames.has(d));
    if (internal.length > 0) wirings.push(`${c.name} → ${internal.join(', ')}`);
  }
  if (wirings.length > 0) {
    md += `\n## Wiring\n`;
    for (const w of wirings) md += `${w}\n`;
  }

  return md;
}

export function generateApiMd(registry) {
  const routeCount = registry.routes.reduce((s, r) => s + (r.routes?.length || 0), 0);
  const schemaCount = registry.schemas.length;

  let md = `# API | ${routeCount} procedures, ${schemaCount} schemas\n`;

  if (registry.routes.length > 0) {
    md += `\n## Routes\n`;
    for (const r of registry.routes) {
      for (const proc of (r.routes || [])) {
        md += `${r.name}.${proc.name} (${proc.method})\n`;
      }
    }
  }

  if (schemaCount > 0) {
    md += `\n## Schemas\n`;
    for (const s of registry.schemas) {
      md += `${s.name} → ${s.path} (${s.fields.join(', ')})\n`;
    }
  }

  return md;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/fingerprint.test.mjs`
Expected: 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/fingerprint.mjs tests/fingerprint.test.mjs
git commit -m "feat: fingerprint generator — fingerprint.md, front.md, api.md"
```

---

## Task 7: Core — Changelog (git log parser)

**Files:**
- Create: `src/core/changelog.mjs`
- Create: `tests/changelog.test.mjs`

- [ ] **Step 1: Write failing tests**

```js
// tests/changelog.test.mjs
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseGitLog, mapCommitsToRegistry } from '../src/core/changelog.mjs';

describe('parseGitLog', () => {
  it('parses oneline git log output', () => {
    const raw = `abc1234 feat: add Modal form variant
def5678 fix: useAuth refresh token
ghi9012 chore: update deps`;
    const commits = parseGitLog(raw);
    assert.equal(commits.length, 3);
    assert.equal(commits[0].hash, 'abc1234');
    assert.ok(commits[0].message.includes('Modal'));
  });

  it('returns empty array for empty input', () => {
    assert.deepStrictEqual(parseGitLog(''), []);
    assert.deepStrictEqual(parseGitLog('  \n  '), []);
  });
});

describe('mapCommitsToRegistry', () => {
  it('maps commits to registry entries by file path', () => {
    const commits = [
      { hash: 'abc', message: 'feat: add form variant', files: ['src/components/Modal.tsx'] },
      { hash: 'def', message: 'fix: refresh', files: ['src/hooks/useAuth.ts'] },
    ];
    const registry = {
      components: [{ name: 'Modal', path: 'src/components/Modal.tsx' }],
      hooks: [{ name: 'useAuth', path: 'src/hooks/useAuth.ts' }],
      utils: [], routes: [], schemas: [],
    };
    const lines = mapCommitsToRegistry(commits, registry);
    assert.ok(lines.some(l => l.includes('Modal')));
    assert.ok(lines.some(l => l.includes('useAuth')));
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/changelog.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/core/changelog.mjs`**

```js
import { execFileSync } from 'node:child_process';

export function parseGitLog(raw) {
  return raw.trim().split('\n')
    .filter(l => l.trim())
    .map(line => {
      const spaceIdx = line.indexOf(' ');
      return { hash: line.slice(0, spaceIdx), message: line.slice(spaceIdx + 1) };
    });
}

export function getRecentCommits(scanPaths, days = 7, cwd = process.cwd()) {
  try {
    const args = ['log', '--oneline', `--since=${days} days`, '--name-only', '--'];
    args.push(...scanPaths);
    const log = execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    const commits = [];
    let current = null;
    for (const line of log.split('\n')) {
      if (!line.trim()) continue;
      const commitMatch = line.match(/^([a-f0-9]{7,}) (.+)$/);
      if (commitMatch) {
        if (current) commits.push(current);
        current = { hash: commitMatch[1], message: commitMatch[2], files: [] };
      } else if (current) {
        current.files.push(line.trim());
      }
    }
    if (current) commits.push(current);
    return commits;
  } catch {
    return [];
  }
}

export function mapCommitsToRegistry(commits, registry) {
  const allEntries = [
    ...registry.components,
    ...registry.hooks,
    ...registry.utils,
    ...(registry.routes || []),
    ...(registry.schemas || []),
  ];
  const pathToName = new Map(allEntries.map(e => [e.path, e.name]));

  const changed = new Map(); // date -> Set of changes
  for (const c of commits) {
    for (const file of (c.files || [])) {
      const name = pathToName.get(file);
      if (!name) continue;
      const isNew = c.message.match(/\b(add|feat|new|create)\b/i);
      const prefix = isNew ? '+' : '~';
      const key = `${prefix}${name}`;
      // Group by rough date from message or just use order
      if (!changed.has(key)) changed.set(key, c.message);
    }
  }

  return [...changed.keys()].map(k => k);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/changelog.test.mjs`
Expected: 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/changelog.mjs tests/changelog.test.mjs
git commit -m "feat: changelog — git log parser and registry mapper"
```

---

## Task 8: Core — Updater (CLAUDE.md, AGENTS.md, steering)

**Files:**
- Create: `src/core/updater.mjs`

This module updates existing files by replacing content between marker comments. No separate test file — tested via integration in the `scan` command test (Task 11).

- [ ] **Step 1: Implement `src/core/updater.mjs`**

```js
import fs from 'node:fs';

const START = '<!-- REGISTRY:START -->';
const END = '<!-- REGISTRY:END -->';

export function updateMarkerBlock(filePath, content) {
  if (!fs.existsSync(filePath)) return false;
  const file = fs.readFileSync(filePath, 'utf8');
  const startIdx = file.indexOf(START);
  const endIdx = file.indexOf(END);
  if (startIdx === -1 || endIdx === -1) return false;
  const updated = file.slice(0, startIdx + START.length) + '\n' + content + '\n' + file.slice(endIdx);
  fs.writeFileSync(filePath, updated);
  return true;
}

export function generateRegistryBlock(registry) {
  const lines = [];
  const kinds = [
    { key: 'components', label: 'Components' },
    { key: 'hooks', label: 'Hooks' },
    { key: 'utils', label: 'Utils' },
    { key: 'routes', label: 'Routes' },
    { key: 'schemas', label: 'Schemas' },
  ];
  for (const { key, label } of kinds) {
    const entries = registry[key] || [];
    if (entries.length === 0) continue;
    lines.push(`\n**${label}** (${entries.length})\n`);
    for (const e of entries) {
      const vars = e.variants?.length ? ` — variants: ${e.variants.join(', ')}` : '';
      const status = e.status ? ` (${e.status})` : '';
      lines.push(`- \`${e.name}\`${status} — \`${e.path}\`${vars}`);
    }
  }
  return lines.join('\n');
}

export function appendSectionIfMissing(filePath, sectionHeader, content) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, content);
    return 'created';
  }
  const file = fs.readFileSync(filePath, 'utf8');
  if (file.includes(sectionHeader)) return 'exists';
  fs.writeFileSync(filePath, file.trimEnd() + '\n\n' + content + '\n');
  return 'appended';
}

export function updateSteeringFrontMd(filePath, frontMdContent) {
  if (!fs.existsSync(filePath)) return false;
  const file = fs.readFileSync(filePath, 'utf8');
  // Keep frontmatter, replace body
  const fmEnd = file.indexOf('---', file.indexOf('---') + 3);
  if (fmEnd === -1) return false;
  const frontmatter = file.slice(0, fmEnd + 3);
  fs.writeFileSync(filePath, frontmatter + '\n\n' + frontMdContent + '\n');
  return true;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/core/updater.mjs
git commit -m "feat: updater — CLAUDE.md/AGENTS.md marker block + steering sync"
```

---

## Task 9: Templates

**Files:**
- Create: `src/templates/config.mjs`
- Create: `src/templates/registry.mjs`
- Create: `src/templates/schema.mjs`
- Create: `src/templates/agents-md.mjs`
- Create: `src/templates/claude-md.mjs`
- Create: `src/templates/kiro-steering.mjs`
- Create: `src/templates/kiro-agents.mjs`
- Create: `src/templates/claude-agents.mjs`
- Create: `src/templates/pre-commit.mjs`
- Create: `src/templates/component.mjs`
- Create: `src/templates/doc-stub.mjs`

All templates are pure functions: `(params) => string`. No tests needed — they're validated by command integration tests.

- [ ] **Step 1: Create `src/templates/config.mjs`**

```js
export function configTemplate({ componentsDir = 'src/components', hooksDir = 'src/hooks', utilsDir = 'src/utils', projectName = '', stack = '' }) {
  return `// drykit.config.mjs
export default {
  projectName: '${projectName}',
  stack: '${stack}',
  scan: {
    components: ['${componentsDir}/**/*.tsx', '${componentsDir}/**/*.jsx'],
    hooks: ['${hooksDir}/**/*.ts', '${hooksDir}/**/*.tsx'],
    utils: ['${utilsDir}/**/*.ts'],
    routes: ['src/routes/**/*.ts', 'src/app/api/**/*.ts'],
    schemas: ['src/schemas/**/*.ts', 'src/types/**/*.ts'],
  },
  registry: 'src/registry.json',
  docs: 'docs/components',
  dryRisk: ['Modal', 'Form', 'Card', 'Button', 'Dialog', 'Drawer',
            'Toast', 'Dropdown', 'Select', 'Input', 'Table'],
  lang: 'en',
};
`;
}
```

- [ ] **Step 2: Create `src/templates/registry.mjs`**

```js
export function registryTemplate() {
  return JSON.stringify({
    "$schema": "./registry.schema.json",
    version: "1",
    generatedAt: new Date().toISOString(),
    components: [],
    hooks: [],
    utils: [],
    routes: [],
    schemas: [],
  }, null, 2) + '\n';
}
```

- [ ] **Step 3: Create `src/templates/schema.mjs`**

```js
export function schemaTemplate() {
  return JSON.stringify({
    "$schema": "http://json-schema.org/draft-07/schema#",
    type: "object",
    required: ["version", "components"],
    properties: {
      version: { type: "string" },
      generatedAt: { type: "string" },
      components: { type: "array", items: { "$ref": "#/definitions/entry" } },
      hooks: { type: "array", items: { "$ref": "#/definitions/entry" } },
      utils: { type: "array", items: { "$ref": "#/definitions/entry" } },
      routes: { type: "array" },
      schemas: { type: "array" },
    },
    definitions: {
      entry: {
        type: "object",
        required: ["name", "path"],
        properties: {
          name: { type: "string" },
          path: { type: "string" },
          variants: { type: "array", items: { type: "string" } },
          props: { type: "object" },
          usage: { type: "string" },
          dependencies: { type: "array", items: { type: "string" } },
          dateCreated: { type: "string" },
          lastModified: { type: "string" },
          status: { type: "string", enum: ["beta", "stable", "deprecated"] },
        },
      },
    },
  }, null, 2) + '\n';
}
```

- [ ] **Step 4: Create `src/templates/agents-md.mjs`**

```js
export function agentsMdTemplate({ projectName }) {
  return `# Project: ${projectName}

## drykit — Component Registry

Read \`.drykit/fingerprint.md\` at the start of every session.
Before creating any component, hook, or utility — check if it already exists.
If fingerprint routes you to \`front.md\` or \`api.md\` — read that file.

### Rules
- NEVER create a component without checking the registry
- If a component exists with variants — use a variant, don't create new
- If you must create new — run: drykit add <Name>
- After creating — verify registry.json was updated

### Component Library Status

<!-- REGISTRY:START -->
_(run \`drykit scan\` to populate)_
<!-- REGISTRY:END -->
`;
}
```

- [ ] **Step 5: Create `src/templates/claude-md.mjs`**

```js
export function claudeMdDrykitSection({ projectName }) {
  return `## drykit — Component Registry

Read \`.drykit/fingerprint.md\` at the start of every session.
Before creating any component, hook, or utility — check if it already exists.
If fingerprint routes you to \`front.md\` or \`api.md\` — read that file.

### Rules
- NEVER create a component without checking the registry
- If a component exists with variants — use a variant, don't create new
- If you must create new — run: drykit add <Name>
- After creating — verify registry.json was updated

### Model Routing

When performing drykit-related tasks, delegate to cheaper models:

- Registry lookup, web search, file scan, duplicate check
  → spawn Agent with model: "haiku"
- Component scaffold, code generation, code review
  → spawn Agent with model: "sonnet"
- Architecture analysis, planning, complex refactoring
  → use main session context (don't delegate)

### Component Library Status

<!-- REGISTRY:START -->
_(run \`drykit scan\` to populate)_
<!-- REGISTRY:END -->
`;
}
```

- [ ] **Step 6: Create `src/templates/kiro-steering.mjs`**

```js
export function kiroSteeringAlways() {
  return `---
inclusion: always
name: drykit-registry
description: Component registry and DRY workflow rules
---

Read \`.drykit/fingerprint.md\` at the start of every session.
Before creating any component, hook, or utility — check if it already exists.
If fingerprint routes you to \`front.md\` or \`api.md\` — read that file.

Rules:
- NEVER create a component without checking the registry
- If a component exists with variants — use a variant, don't create new
- If you must create new — run: drykit add <Name>
- After creating — verify registry.json was updated
`;
}

export function kiroSteeringFront() {
  return `---
inclusion: fileMatch
fileMatchPattern: "src/components/**/*.tsx"
name: drykit-frontend
description: Frontend component registry — read before creating UI
---

[auto-generated content from .drykit/front.md — run drykit scan to populate]
`;
}
```

- [ ] **Step 7: Create `src/templates/kiro-agents.mjs`**

```js
export function kiroScannerAgent() {
  return JSON.stringify({
    name: "drykit-scanner",
    description: "Scan project and update component registry",
    model: "claude-haiku-4-5",
    tools: ["read", "write", "bash"],
    prompt: "Run `drykit scan` and report changes. Do NOT modify component files directly.",
  }, null, 2) + '\n';
}

export function kiroArchitectAgent() {
  return JSON.stringify({
    name: "drykit-architect",
    description: "Analyze architecture and suggest improvements",
    model: "claude-sonnet-4",
    tools: ["read", "glob", "grep"],
    resources: ["file://.drykit/**/*.md", "file://registry.json"],
    prompt: "Read .drykit/fingerprint.md and relevant detail files. Analyze component structure. Identify duplications, missing abstractions, unused components. Propose specific refactoring steps.",
  }, null, 2) + '\n';
}
```

- [ ] **Step 8: Create `src/templates/claude-agents.mjs`**

```js
export function claudeScannerAgent() {
  return `---
name: drykit-scanner
---

You are a registry scanner. Your job:
1. Read drykit.config.mjs to find scan paths
2. Run \`drykit scan\` to update the registry
3. Report what changed: new entries, updated entries, potential duplicates
4. If duplicates found — suggest which to merge and how

Do NOT modify component files. Only run drykit CLI commands.
`;
}

export function claudeArchitectAgent() {
  return `---
name: drykit-architect
---

You are an architecture advisor. Your job:
1. Read .drykit/fingerprint.md and the relevant detail file (front.md or api.md)
2. Analyze the current component structure
3. Identify: missing abstractions, over-duplicated patterns, unused components
4. Propose refactoring plan with specific file changes

Always check registry.json before suggesting new components.
`;
}
```

- [ ] **Step 9: Create `src/templates/pre-commit.mjs`**

```js
export function preCommitTemplate() {
  return `#!/usr/bin/env sh
set -e

STAGED=$(git diff --cached --name-only --diff-filter=ACMR \\
  -- 'src/components/**' 'src/hooks/**' 'src/utils/**' || true)

if [ -z "$STAGED" ]; then
  exit 0
fi

npx drykit check --ci
`;
}
```

- [ ] **Step 10: Create `src/templates/component.mjs`**

```js
export function componentTemplate({ name, typescript = true }) {
  if (typescript) {
    return `interface ${name}Props {
  // TODO: define props
}

export function ${name}(props: ${name}Props) {
  return <div>${name}</div>;
}
`;
  }
  return `export function ${name}(props) {
  return <div>${name}</div>;
}
`;
}
```

- [ ] **Step 11: Create `src/templates/doc-stub.mjs`**

```js
export function docStubTemplate({ name, path: filePath, variants = [], props = {} }) {
  const propList = Object.entries(props).map(([k, v]) => `| \`${k}\` | \`${v}\` | |`).join('\n');
  const variantList = variants.length ? variants.map(v => `- \`${v}\``).join('\n') : '_(none)_';

  return `# ${name}

**Path:** \`${filePath}\`

## Usage

\`\`\`tsx
import { ${name} } from '@/components/${name}';
\`\`\`

## Props

| Prop | Type | Description |
|------|------|-------------|
${propList || '| | | |'}

## Variants

${variantList}
`;
}
```

- [ ] **Step 12: Commit**

```bash
git add src/templates/
git commit -m "feat: all templates — config, registry, agents, steering, scaffold"
```

---

## Task 10: Command — `drykit init`

**Files:**
- Create: `src/commands/init.mjs`
- Create: `tests/commands/init.test.mjs`

- [ ] **Step 1: Write failing test**

```js
// tests/commands/init.test.mjs
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { runInit } from '../src/commands/init.mjs';

const TMP = path.join(import.meta.dirname, '__tmp_init');

describe('init (non-interactive)', () => {
  before(() => fs.mkdirSync(TMP, { recursive: true }));
  after(() => fs.rmSync(TMP, { recursive: true, force: true }));

  it('creates all expected files with defaults', async () => {
    await runInit({
      root: TMP,
      answers: {
        projectName: 'test-app',
        stack: 'React 19',
        css: 'Tailwind 4',
        typescript: true,
        ai: 'both',
        componentsDir: 'src/components',
      },
    });

    assert.ok(fs.existsSync(path.join(TMP, 'drykit.config.mjs')));
    assert.ok(fs.existsSync(path.join(TMP, 'src', 'registry.json')));
    assert.ok(fs.existsSync(path.join(TMP, 'src', 'registry.schema.json')));
    assert.ok(fs.existsSync(path.join(TMP, '.drykit', 'fingerprint.md')));
    assert.ok(fs.existsSync(path.join(TMP, '.drykit', 'front.md')));
    assert.ok(fs.existsSync(path.join(TMP, '.drykit', 'api.md')));
    assert.ok(fs.existsSync(path.join(TMP, 'AGENTS.md')));
    assert.ok(fs.existsSync(path.join(TMP, 'CLAUDE.md')));
    assert.ok(fs.existsSync(path.join(TMP, '.kiro', 'steering', 'drykit.md')));
    assert.ok(fs.existsSync(path.join(TMP, '.kiro', 'steering', 'drykit-front.md')));
    assert.ok(fs.existsSync(path.join(TMP, '.kiro', 'agents', 'drykit-scanner.json')));
    assert.ok(fs.existsSync(path.join(TMP, '.kiro', 'agents', 'drykit-architect.json')));
    assert.ok(fs.existsSync(path.join(TMP, '.claude', 'agents', 'drykit-scanner.md')));
    assert.ok(fs.existsSync(path.join(TMP, '.claude', 'agents', 'drykit-architect.md')));
  });

  it('appends to existing CLAUDE.md without overwriting', async () => {
    const tmp2 = path.join(TMP, 'existing');
    fs.mkdirSync(tmp2, { recursive: true });
    fs.writeFileSync(path.join(tmp2, 'CLAUDE.md'), '# My Project\n\nExisting content.\n');

    await runInit({
      root: tmp2,
      answers: { projectName: 'test2', stack: 'Next.js', css: 'none', typescript: true, ai: 'claude', componentsDir: 'src/components' },
    });

    const claude = fs.readFileSync(path.join(tmp2, 'CLAUDE.md'), 'utf8');
    assert.ok(claude.includes('Existing content'));
    assert.ok(claude.includes('drykit'));
    assert.ok(claude.includes('REGISTRY:START'));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/commands/init.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/commands/init.mjs`**

```js
import fs from 'node:fs';
import path from 'node:path';
import { configTemplate } from '../templates/config.mjs';
import { registryTemplate } from '../templates/registry.mjs';
import { schemaTemplate } from '../templates/schema.mjs';
import { agentsMdTemplate } from '../templates/agents-md.mjs';
import { claudeMdDrykitSection } from '../templates/claude-md.mjs';
import { kiroSteeringAlways, kiroSteeringFront } from '../templates/kiro-steering.mjs';
import { kiroScannerAgent, kiroArchitectAgent } from '../templates/kiro-agents.mjs';
import { claudeScannerAgent, claudeArchitectAgent } from '../templates/claude-agents.mjs';
import { preCommitTemplate } from '../templates/pre-commit.mjs';
import { appendSectionIfMissing } from '../core/updater.mjs';

function mkdirp(dir) { fs.mkdirSync(dir, { recursive: true }); }

function writeIfMissing(filePath, content) {
  if (fs.existsSync(filePath)) return false;
  mkdirp(path.dirname(filePath));
  fs.writeFileSync(filePath, content);
  return true;
}

async function promptUser() {
  const prompts = (await import('prompts')).default;
  const response = await prompts([
    { type: 'text', name: 'projectName', message: 'Project name:', initial: path.basename(process.cwd()) },
    { type: 'text', name: 'stack', message: 'Stack (e.g. React 19, Next.js 15):', initial: 'React 19' },
    { type: 'text', name: 'css', message: 'CSS framework (e.g. Tailwind 4, none):', initial: 'Tailwind 4' },
    { type: 'confirm', name: 'typescript', message: 'TypeScript?', initial: true },
    { type: 'select', name: 'ai', message: 'AI tools:', choices: [
      { title: 'Both (Claude Code + Kiro)', value: 'both' },
      { title: 'Claude Code only', value: 'claude' },
      { title: 'Kiro only', value: 'kiro' },
    ]},
    { type: 'text', name: 'componentsDir', message: 'Components directory:', initial: 'src/components' },
  ]);
  return response;
}

export async function runInit({ root = process.cwd(), answers = null } = {}) {
  const a = answers || await promptUser();
  const { projectName, stack, css, typescript, ai, componentsDir } = a;

  const useClaude = ai === 'both' || ai === 'claude';
  const useKiro = ai === 'both' || ai === 'kiro';

  // drykit.config.mjs
  writeIfMissing(path.join(root, 'drykit.config.mjs'), configTemplate({ componentsDir, projectName, stack: `${stack}${css !== 'none' ? ' + ' + css : ''}` }));

  // registry.json + schema
  const regDir = path.join(root, 'src');
  mkdirp(regDir);
  writeIfMissing(path.join(regDir, 'registry.json'), registryTemplate());
  writeIfMissing(path.join(regDir, 'registry.schema.json'), schemaTemplate());

  // .drykit/ fingerprint files
  const drykitDir = path.join(root, '.drykit');
  mkdirp(drykitDir);
  writeIfMissing(path.join(drykitDir, 'fingerprint.md'),
    `# ${projectName} | ${stack}${css !== 'none' ? ' + ' + css : ''}\n# Fingerprint: ${new Date().toISOString()} (auto-generated by drykit scan)\n\n## Routing\n- Building UI/component → read .drykit/front.md\n- Building API/endpoint → read .drykit/api.md\n\n## Rules\n- ALWAYS read the relevant file BEFORE creating anything\n- If something exists — use it, don't create new\n- New component? Check variants of existing ones first\n`);
  writeIfMissing(path.join(drykitDir, 'front.md'), '# Frontend | 0 components, 0 hooks, 0 utils\n');
  writeIfMissing(path.join(drykitDir, 'api.md'), '# API | 0 procedures, 0 schemas\n');

  // AGENTS.md (Kiro reads natively, always)
  writeIfMissing(path.join(root, 'AGENTS.md'), agentsMdTemplate({ projectName }));

  // CLAUDE.md
  if (useClaude) {
    appendSectionIfMissing(
      path.join(root, 'CLAUDE.md'),
      '## drykit',
      claudeMdDrykitSection({ projectName })
    );
  }

  // .kiro/steering/
  if (useKiro) {
    const steeringDir = path.join(root, '.kiro', 'steering');
    mkdirp(steeringDir);
    writeIfMissing(path.join(steeringDir, 'drykit.md'), kiroSteeringAlways());
    writeIfMissing(path.join(steeringDir, 'drykit-front.md'), kiroSteeringFront());

    const kiroAgentsDir = path.join(root, '.kiro', 'agents');
    mkdirp(kiroAgentsDir);
    writeIfMissing(path.join(kiroAgentsDir, 'drykit-scanner.json'), kiroScannerAgent());
    writeIfMissing(path.join(kiroAgentsDir, 'drykit-architect.json'), kiroArchitectAgent());
  }

  // .claude/agents/
  if (useClaude) {
    const claudeAgentsDir = path.join(root, '.claude', 'agents');
    mkdirp(claudeAgentsDir);
    writeIfMissing(path.join(claudeAgentsDir, 'drykit-scanner.md'), claudeScannerAgent());
    writeIfMissing(path.join(claudeAgentsDir, 'drykit-architect.md'), claudeArchitectAgent());
  }

  // .husky/pre-commit
  const huskyDir = path.join(root, '.husky');
  mkdirp(huskyDir);
  const hookPath = path.join(huskyDir, 'pre-commit');
  if (fs.existsSync(hookPath)) {
    const existing = fs.readFileSync(hookPath, 'utf8');
    if (!existing.includes('drykit')) {
      fs.writeFileSync(hookPath, existing.trimEnd() + '\n\n# drykit check\nnpx drykit check --ci\n');
    }
  } else {
    writeIfMissing(hookPath, preCommitTemplate());
  }

  // docs dir
  mkdirp(path.join(root, 'docs', 'components'));

  // Update package.json scripts (if exists)
  const pkgPath = path.join(root, 'package.json');
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    pkg.scripts = pkg.scripts || {};
    const drykitScripts = {
      'drykit:scan': 'drykit scan',
      'drykit:check': 'drykit check',
      'drykit:docs': 'drykit docs',
    };
    let changed = false;
    for (const [k, v] of Object.entries(drykitScripts)) {
      if (!pkg.scripts[k]) { pkg.scripts[k] = v; changed = true; }
    }
    if (changed) fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  }

  console.log(`\n✓ drykit initialized in ${root}`);
  console.log(`  Run: drykit scan — to populate the registry`);
}

export default async function init(args) {
  await runInit();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/commands/init.test.mjs`
Expected: 2 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/commands/init.mjs tests/commands/init.test.mjs
git commit -m "feat: drykit init — interactive wizard + file generation"
```

---

## Task 11: Command — `drykit scan`

**Files:**
- Create: `src/commands/scan.mjs`
- Create: `tests/commands/scan.test.mjs`

- [ ] **Step 1: Write failing test**

```js
// tests/commands/scan.test.mjs
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { runScan } from '../src/commands/scan.mjs';

const TMP = path.join(import.meta.dirname, '__tmp_scan');

describe('scan', () => {
  before(() => {
    fs.mkdirSync(path.join(TMP, 'src', 'components'), { recursive: true });
    fs.mkdirSync(path.join(TMP, 'src', 'hooks'), { recursive: true });
    fs.mkdirSync(path.join(TMP, '.drykit'), { recursive: true });

    // config
    fs.writeFileSync(path.join(TMP, 'drykit.config.mjs'),
      `export default { scan: { components: ['src/components/**/*.tsx'], hooks: ['src/hooks/**/*.ts'], utils: [], routes: ['src/routes/**/*.ts'], schemas: ['src/schemas/**/*.ts'] }, registry: 'src/registry.json', docs: 'docs/components', dryRisk: ['Modal'], lang: 'en' };\n`);

    // empty registry
    fs.writeFileSync(path.join(TMP, 'src', 'registry.json'),
      JSON.stringify({ version: '1', generatedAt: '', components: [], hooks: [], utils: [], routes: [], schemas: [] }, null, 2));

    // sample component
    fs.writeFileSync(path.join(TMP, 'src', 'components', 'Modal.tsx'),
      `import React from 'react';\ninterface ModalProps {\n  open: boolean;\n  variant: 'primary' | 'form';\n}\nexport function Modal(props: ModalProps) { return null; }\n`);

    // sample hook
    fs.writeFileSync(path.join(TMP, 'src', 'hooks', 'useAuth.ts'),
      `import { useState } from 'react';\nexport function useAuth() { return useState(null); }\n`);

    // sample route
    fs.mkdirSync(path.join(TMP, 'src', 'routes'), { recursive: true });
    fs.writeFileSync(path.join(TMP, 'src', 'routes', 'users.ts'),
      `import { z } from 'zod';\nexport const usersRouter = {\n  profile: { method: 'query' },\n  update: { method: 'mutation' },\n};\n`);

    // sample schema
    fs.mkdirSync(path.join(TMP, 'src', 'schemas'), { recursive: true });
    fs.writeFileSync(path.join(TMP, 'src', 'schemas', 'user.ts'),
      `import { z } from 'zod';\nexport const UserSchema = z.object({ id: z.string(), email: z.string() });\n`);

    // AGENTS.md with markers
    fs.writeFileSync(path.join(TMP, 'AGENTS.md'),
      `# Project\n<!-- REGISTRY:START -->\nold\n<!-- REGISTRY:END -->\n`);

    // fingerprint stubs
    fs.writeFileSync(path.join(TMP, '.drykit', 'fingerprint.md'), '');
    fs.writeFileSync(path.join(TMP, '.drykit', 'front.md'), '');
    fs.writeFileSync(path.join(TMP, '.drykit', 'api.md'), '');
  });

  after(() => fs.rmSync(TMP, { recursive: true, force: true }));

  it('populates registry from scanned files', async () => {
    await runScan({ root: TMP });
    const reg = JSON.parse(fs.readFileSync(path.join(TMP, 'src', 'registry.json'), 'utf8'));
    assert.equal(reg.components.length, 1);
    assert.equal(reg.components[0].name, 'Modal');
    assert.deepStrictEqual(reg.components[0].variants, ['primary', 'form']);
    assert.equal(reg.hooks.length, 1);
    assert.equal(reg.hooks[0].name, 'useAuth');
    assert.ok(reg.routes.length >= 1);
    assert.ok(reg.schemas.length >= 1);
  });

  it('generates fingerprint files', async () => {
    await runScan({ root: TMP });
    const fp = fs.readFileSync(path.join(TMP, '.drykit', 'fingerprint.md'), 'utf8');
    assert.ok(fp.includes('Routing'));
    const front = fs.readFileSync(path.join(TMP, '.drykit', 'front.md'), 'utf8');
    assert.ok(front.includes('Modal'));
    assert.ok(front.includes('useAuth'));
  });

  it('updates AGENTS.md registry block', async () => {
    await runScan({ root: TMP });
    const agents = fs.readFileSync(path.join(TMP, 'AGENTS.md'), 'utf8');
    assert.ok(agents.includes('Modal'));
    assert.ok(!agents.includes('old'));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/commands/scan.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/commands/scan.mjs`**

```js
import fs from 'node:fs';
import path from 'node:path';
import { glob } from 'glob';
import { loadConfig } from '../core/config.mjs';
import { loadRegistry, saveRegistry, upsertEntry } from '../core/registry.mjs';
import { extractComponent, extractHook, extractRoute, extractSchema } from '../core/extractor.mjs';
import { generateFingerprint, generateFrontMd, generateApiMd } from '../core/fingerprint.mjs';
import { getRecentCommits, mapCommitsToRegistry } from '../core/changelog.mjs';
import { updateMarkerBlock, generateRegistryBlock, updateSteeringFrontMd } from '../core/updater.mjs';

export async function runScan({ root = process.cwd() } = {}) {
  const config = await loadConfig(root);
  const regPath = path.join(root, config.registry);
  const reg = loadRegistry(regPath);

  // Scan components
  const compFiles = await glob(config.scan.components, { cwd: root });
  for (const f of compFiles) {
    try {
      const data = extractComponent(path.join(root, f));
      data.path = f;
      upsertEntry(reg, 'components', data);
    } catch (e) { console.warn(`⚠ skip ${f}: ${e.message}`); }
  }

  // Scan hooks
  const hookFiles = await glob(config.scan.hooks || [], { cwd: root });
  for (const f of hookFiles) {
    try {
      const data = extractHook(path.join(root, f));
      data.path = f;
      upsertEntry(reg, 'hooks', data);
    } catch (e) { console.warn(`⚠ skip ${f}: ${e.message}`); }
  }

  // Scan utils
  const utilFiles = await glob(config.scan.utils || [], { cwd: root });
  for (const f of utilFiles) {
    try {
      const data = extractHook(path.join(root, f)); // same extraction as hooks
      data.path = f;
      upsertEntry(reg, 'utils', data);
    } catch (e) { console.warn(`⚠ skip ${f}: ${e.message}`); }
  }

  // Scan routes
  const routeFiles = await glob(config.scan.routes || [], { cwd: root });
  for (const f of routeFiles) {
    try {
      const data = extractRoute(path.join(root, f));
      data.path = f;
      upsertEntry(reg, 'routes', data);
    } catch (e) { console.warn(`⚠ skip ${f}: ${e.message}`); }
  }

  // Scan schemas
  const schemaFiles = await glob(config.scan.schemas || [], { cwd: root });
  for (const f of schemaFiles) {
    try {
      const results = extractSchema(path.join(root, f));
      for (const s of results) {
        s.path = f;
        upsertEntry(reg, 'schemas', s);
      }
    } catch (e) { console.warn(`⚠ skip ${f}: ${e.message}`); }
  }

  // Save registry
  saveRegistry(regPath, reg);
  const total = reg.components.length + reg.hooks.length + reg.utils.length;
  console.log(`✓ Registry: ${total} entries (${reg.components.length} components, ${reg.hooks.length} hooks, ${reg.utils.length} utils)`);

  // Changelog
  const allPaths = [
    ...config.scan.components,
    ...(config.scan.hooks || []),
    ...(config.scan.utils || []),
  ];
  const commits = getRecentCommits(allPaths, 7, root);
  const changedLines = mapCommitsToRegistry(commits, reg);

  // Generate fingerprint files
  const drykitDir = path.join(root, '.drykit');
  fs.mkdirSync(drykitDir, { recursive: true });

  const projectName = config.projectName || path.basename(root);
  const stack = config.stack || '';
  const fpContent = generateFingerprint(reg, config, projectName, stack, changedLines);
  fs.writeFileSync(path.join(drykitDir, 'fingerprint.md'), fpContent);

  const frontContent = generateFrontMd(reg);
  fs.writeFileSync(path.join(drykitDir, 'front.md'), frontContent);

  const apiContent = generateApiMd(reg);
  fs.writeFileSync(path.join(drykitDir, 'api.md'), apiContent);

  console.log('✓ Fingerprint: .drykit/fingerprint.md, front.md, api.md');

  // Update marker blocks in AGENTS.md, CLAUDE.md
  const block = generateRegistryBlock(reg);
  const agentsUpdated = updateMarkerBlock(path.join(root, 'AGENTS.md'), block);
  const claudeUpdated = updateMarkerBlock(path.join(root, 'CLAUDE.md'), block);
  if (agentsUpdated) console.log('✓ Updated AGENTS.md registry block');
  if (claudeUpdated) console.log('✓ Updated CLAUDE.md registry block');

  // Update .kiro/steering/drykit-front.md if exists
  const steeringFront = path.join(root, '.kiro', 'steering', 'drykit-front.md');
  if (fs.existsSync(steeringFront)) {
    updateSteeringFrontMd(steeringFront, frontContent);
    console.log('✓ Updated .kiro/steering/drykit-front.md');
  }
}

export default async function scan(args) {
  await runScan();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/commands/scan.test.mjs`
Expected: 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/commands/scan.mjs tests/commands/scan.test.mjs
git commit -m "feat: drykit scan — full pipeline: extract, registry, fingerprint, update"
```

---

## Task 12: Command — `drykit add`

**Files:**
- Create: `src/commands/add.mjs`
- Create: `tests/commands/add.test.mjs`

- [ ] **Step 1: Write failing test**

```js
// tests/commands/add.test.mjs
import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { runAdd } from '../src/commands/add.mjs';

const TMP = path.join(import.meta.dirname, '__tmp_add');
const REG = path.join(TMP, 'src', 'registry.json');

describe('add — scaffold mode', () => {
  before(() => {
    fs.mkdirSync(path.join(TMP, 'src', 'components'), { recursive: true });
    fs.mkdirSync(path.join(TMP, '.drykit'), { recursive: true });
    fs.mkdirSync(path.join(TMP, 'docs', 'components'), { recursive: true });
    fs.writeFileSync(path.join(TMP, 'drykit.config.mjs'),
      `export default { scan: { components: ['src/components/**/*.tsx'], hooks: [], utils: [], routes: [], schemas: [] }, registry: 'src/registry.json', docs: 'docs/components', dryRisk: ['Modal'], lang: 'en' };\n`);
  });
  after(() => fs.rmSync(TMP, { recursive: true, force: true }));

  beforeEach(() => {
    fs.writeFileSync(REG, JSON.stringify({ version: '1', generatedAt: '', components: [], hooks: [], utils: [], routes: [], schemas: [] }, null, 2));
  });

  it('scaffolds new component file + registers it', async () => {
    await runAdd({ root: TMP, name: 'ContactForm', force: true });
    assert.ok(fs.existsSync(path.join(TMP, 'src', 'components', 'ContactForm.tsx')));
    const reg = JSON.parse(fs.readFileSync(REG, 'utf8'));
    assert.equal(reg.components.length, 1);
    assert.equal(reg.components[0].name, 'ContactForm');
  });

  it('creates doc stub', async () => {
    await runAdd({ root: TMP, name: 'InfoCard', force: true });
    assert.ok(fs.existsSync(path.join(TMP, 'docs', 'components', 'InfoCard.md')));
  });
});

describe('add — register existing file', () => {
  before(() => {
    fs.mkdirSync(path.join(TMP, 'src', 'components'), { recursive: true });
    fs.writeFileSync(path.join(TMP, 'src', 'components', 'Button.tsx'),
      `import React from 'react';\ninterface ButtonProps { variant: 'primary' | 'ghost'; }\nexport function Button(props: ButtonProps) { return null; }\n`);
    fs.writeFileSync(REG, JSON.stringify({ version: '1', generatedAt: '', components: [], hooks: [], utils: [], routes: [], schemas: [] }, null, 2));
  });

  it('registers existing file by path', async () => {
    await runAdd({ root: TMP, name: 'Button', filePath: 'src/components/Button.tsx', force: true });
    const reg = JSON.parse(fs.readFileSync(REG, 'utf8'));
    assert.equal(reg.components.length, 1);
    assert.equal(reg.components[0].name, 'Button');
    assert.deepStrictEqual(reg.components[0].variants, ['primary', 'ghost']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/commands/add.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/commands/add.mjs`**

```js
import fs from 'node:fs';
import path from 'node:path';
import { loadConfig } from '../core/config.mjs';
import { loadRegistry, saveRegistry, upsertEntry, findEntry } from '../core/registry.mjs';
import { extractComponent } from '../core/extractor.mjs';
import { findDuplicates } from '../core/duplicates.mjs';
import { componentTemplate } from '../templates/component.mjs';
import { docStubTemplate } from '../templates/doc-stub.mjs';

export async function runAdd({ root = process.cwd(), name, filePath, force = false } = {}) {
  const config = await loadConfig(root);
  const regPath = path.join(root, config.registry);
  const reg = loadRegistry(regPath);

  // Check for near-duplicates
  if (!force) {
    const allEntries = [...reg.components, ...reg.hooks, ...reg.utils];
    const fakeEntry = { name, variants: [] };
    const dupes = findDuplicates([...allEntries, fakeEntry], config.dryRisk);
    const relevant = dupes.filter(d => d.a === name || d.b === name);
    if (relevant.length > 0) {
      for (const d of relevant) {
        const other = d.a === name ? d.b : d.a;
        console.warn(`⚠  Similar component exists: ${other}`);
        console.warn(`   ${d.suggestion}`);
      }
      console.warn('   Use --force to add anyway.');
      return;
    }
  }

  // Determine component dir from config — find the common base before any glob chars
  const firstPattern = config.scan.components[0] || 'src/components/**/*.tsx';
  const globIdx = firstPattern.search(/[*?{[]/);
  const componentsDir = globIdx > 0 ? firstPattern.slice(0, globIdx).replace(/\/+$/, '') : 'src/components';
  const resolvedPath = filePath || path.join(componentsDir, `${name}.tsx`);
  const absPath = path.join(root, resolvedPath);

  // Scaffold or extract
  let entry;
  if (fs.existsSync(absPath)) {
    const data = extractComponent(absPath);
    entry = { ...data, path: resolvedPath };
  } else {
    fs.mkdirSync(path.dirname(absPath), { recursive: true });
    const ts = config.scan.components[0]?.includes('.tsx') !== false;
    fs.writeFileSync(absPath, componentTemplate({ name, typescript: ts }));
    entry = { name, path: resolvedPath, variants: [], props: {}, dependencies: [] };
    console.log(`✓ Created ${resolvedPath}`);
  }

  // Register
  upsertEntry(reg, 'components', entry);
  saveRegistry(regPath, reg);
  console.log(`✓ Registered ${name} in registry`);

  // Doc stub
  const docPath = path.join(root, config.docs, `${name}.md`);
  if (!fs.existsSync(docPath)) {
    fs.mkdirSync(path.dirname(docPath), { recursive: true });
    fs.writeFileSync(docPath, docStubTemplate({ name, path: resolvedPath, variants: entry.variants || [], props: entry.props || {} }));
    console.log(`✓ Created doc stub: ${config.docs}/${name}.md`);
  }
}

export default async function add(args) {
  const force = args.includes('--force');
  const filtered = args.filter(a => !a.startsWith('--'));
  const name = filtered[0];
  const filePath = filtered[1];
  if (!name) {
    console.error('Usage: drykit add <Name> [path] [--force]');
    process.exit(1);
  }
  await runAdd({ name, filePath, force });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/commands/add.test.mjs`
Expected: 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/commands/add.mjs tests/commands/add.test.mjs
git commit -m "feat: drykit add — scaffold + register + duplicate warning"
```

---

## Task 13: Command — `drykit check`

**Files:**
- Create: `src/commands/check.mjs`
- Create: `tests/commands/check.test.mjs`

- [ ] **Step 1: Write failing test**

```js
// tests/commands/check.test.mjs
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { runCheck } from '../src/commands/check.mjs';

const TMP = path.join(import.meta.dirname, '__tmp_check');

describe('check', () => {
  before(() => {
    fs.mkdirSync(path.join(TMP, 'src', 'components'), { recursive: true });
    fs.writeFileSync(path.join(TMP, 'drykit.config.mjs'),
      `export default { scan: { components: ['src/components/**/*.tsx'], hooks: [], utils: [], routes: [], schemas: [] }, registry: 'src/registry.json', docs: 'docs/components', dryRisk: ['Modal'], lang: 'en' };\n`);

    // Registry with Modal only
    fs.writeFileSync(path.join(TMP, 'src', 'registry.json'),
      JSON.stringify({ version: '1', generatedAt: '', components: [
        { name: 'Modal', path: 'src/components/Modal.tsx', variants: ['primary'], props: {}, dependencies: [] }
      ], hooks: [], utils: [], routes: [], schemas: [] }, null, 2));

    // Two component files — Modal (registered) + Foo (unregistered)
    fs.writeFileSync(path.join(TMP, 'src', 'components', 'Modal.tsx'), 'export function Modal() {}');
    fs.writeFileSync(path.join(TMP, 'src', 'components', 'Foo.tsx'), 'export function Foo() {}');
  });

  after(() => fs.rmSync(TMP, { recursive: true, force: true }));

  it('returns unregistered files', async () => {
    const result = await runCheck({ root: TMP, ci: false });
    assert.ok(result.unregistered.length >= 1);
    assert.ok(result.unregistered.some(f => f.includes('Foo')));
  });

  it('returns exit code 1 in CI mode when unregistered files exist', async () => {
    const result = await runCheck({ root: TMP, ci: true });
    assert.equal(result.exitCode, 1);
  });

  it('returns exit code 0 when all files registered', async () => {
    // Register Foo
    const reg = JSON.parse(fs.readFileSync(path.join(TMP, 'src', 'registry.json'), 'utf8'));
    reg.components.push({ name: 'Foo', path: 'src/components/Foo.tsx', variants: [], props: {}, dependencies: [] });
    fs.writeFileSync(path.join(TMP, 'src', 'registry.json'), JSON.stringify(reg, null, 2));

    const result = await runCheck({ root: TMP, ci: true });
    assert.equal(result.exitCode, 0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/commands/check.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/commands/check.mjs`**

```js
import path from 'node:path';
import { glob } from 'glob';
import { loadConfig } from '../core/config.mjs';
import { loadRegistry } from '../core/registry.mjs';
import { findUnregistered, findDuplicates } from '../core/duplicates.mjs';

export async function runCheck({ root = process.cwd(), ci = false } = {}) {
  const config = await loadConfig(root);
  const regPath = path.join(root, config.registry);
  const reg = loadRegistry(regPath);

  // Gather all scanned files
  const allPatterns = [
    ...config.scan.components,
    ...(config.scan.hooks || []),
    ...(config.scan.utils || []),
  ];
  const files = await glob(allPatterns, { cwd: root });

  // All registered entries
  const allEntries = [...reg.components, ...reg.hooks, ...reg.utils];

  // Unregistered
  const unregistered = findUnregistered(files, allEntries);

  // Duplicates
  const dupes = findDuplicates(allEntries, config.dryRisk);

  // Output
  if (unregistered.length > 0) {
    console.error(`\n✗ ${unregistered.length} unregistered file(s):\n`);
    for (const f of unregistered) {
      const name = path.basename(f).replace(/\.(tsx?|jsx?)$/, '');
      console.error(`  ${f}`);
      console.error(`    → run: drykit add ${name} ${f}\n`);
    }
  }

  if (dupes.length > 0) {
    console.warn(`\n⚠ ${dupes.length} potential duplicate(s):\n`);
    for (const d of dupes) {
      console.warn(`  ${d.a} ↔ ${d.b} (distance: ${d.distance})`);
      console.warn(`    ${d.suggestion}\n`);
    }
  }

  if (unregistered.length === 0 && dupes.length === 0) {
    console.log('✓ Registry clean.');
  }

  const exitCode = ci && unregistered.length > 0 ? 1 : 0;
  return { unregistered, dupes, exitCode };
}

export default async function check(args) {
  const ci = args.includes('--ci');
  const result = await runCheck({ ci });
  process.exit(result.exitCode);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/commands/check.test.mjs`
Expected: 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/commands/check.mjs tests/commands/check.test.mjs
git commit -m "feat: drykit check — unregistered files + duplicate detection"
```

---

## Task 14: Command — `drykit docs`

**Files:**
- Create: `src/commands/docs.mjs`

- [ ] **Step 1: Implement `src/commands/docs.mjs`**

```js
import fs from 'node:fs';
import path from 'node:path';
import { loadConfig } from '../core/config.mjs';
import { loadRegistry } from '../core/registry.mjs';
import { updateMarkerBlock, generateRegistryBlock } from '../core/updater.mjs';

export async function runDocs({ root = process.cwd() } = {}) {
  const config = await loadConfig(root);
  const regPath = path.join(root, config.registry);
  const reg = loadRegistry(regPath);

  // Generate COMPONENTS.md
  const docsDir = path.join(root, path.dirname(config.docs));
  fs.mkdirSync(docsDir, { recursive: true });
  const componentsPath = path.join(docsDir, 'COMPONENTS.md');

  const lines = ['# Component Library\n', `_Auto-generated from registry. Updated: ${new Date().toISOString().slice(0, 10)}_\n`];

  const kinds = [
    { key: 'components', label: 'Components' },
    { key: 'hooks', label: 'Hooks' },
    { key: 'utils', label: 'Utils' },
    { key: 'routes', label: 'Routes' },
    { key: 'schemas', label: 'Schemas' },
  ];

  for (const { key, label } of kinds) {
    const entries = reg[key] || [];
    if (entries.length === 0) continue;
    lines.push(`\n## ${label}\n`);
    for (const e of entries) {
      const vars = e.variants?.length ? ` — variants: ${e.variants.join(', ')}` : '';
      const status = e.status ? ` (${e.status})` : '';
      if (key === 'routes' && e.routes) {
        lines.push(`### ${e.name}\n`);
        lines.push(`**Path:** \`${e.path}\`\n`);
        for (const r of e.routes) {
          lines.push(`- \`${e.name}.${r.name}\` (${r.method})`);
        }
        lines.push('');
      } else if (key === 'schemas' && e.fields) {
        lines.push(`### ${e.name}\n`);
        lines.push(`**Path:** \`${e.path}\` — fields: ${e.fields.join(', ')}\n`);
      } else {
        lines.push(`### ${e.name}${status}\n`);
        lines.push(`**Path:** \`${e.path}\`${vars}\n`);
        if (e.props && Object.keys(e.props).length > 0) {
          lines.push('| Prop | Type |');
          lines.push('|------|------|');
          for (const [k, v] of Object.entries(e.props)) {
            lines.push(`| \`${k}\` | \`${v}\` |`);
          }
          lines.push('');
        }
      }
    }
  }

  fs.writeFileSync(componentsPath, lines.join('\n') + '\n');
  console.log(`✓ Generated ${componentsPath}`);

  // Update CLAUDE.md + AGENTS.md marker blocks
  const block = generateRegistryBlock(reg);
  if (updateMarkerBlock(path.join(root, 'CLAUDE.md'), block)) {
    console.log('✓ Updated CLAUDE.md registry block');
  }
  if (updateMarkerBlock(path.join(root, 'AGENTS.md'), block)) {
    console.log('✓ Updated AGENTS.md registry block');
  }
}

export default async function docs(args) {
  await runDocs();
}
```

- [ ] **Step 2: Verify manually**

Run: `node bin/drykit.mjs docs` (in a project with registry entries)
Expected: COMPONENTS.md generated, CLAUDE.md/AGENTS.md blocks updated.

- [ ] **Step 3: Commit**

```bash
git add src/commands/docs.mjs
git commit -m "feat: drykit docs — generate COMPONENTS.md + update marker blocks"
```

---

## Task 15: CLI Entry Point — Final Wiring

**Files:**
- Modify: `bin/drykit.mjs` (replace stub with final version)

- [ ] **Step 1: Update `bin/drykit.mjs` with version flag and error handling**

```js
#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));

const [,, command, ...args] = process.argv;

if (command === '--version' || command === '-v') {
  console.log(pkg.version);
  process.exit(0);
}

const COMMANDS = ['init', 'scan', 'add', 'check', 'docs'];

if (!command || command === '--help' || command === '-h') {
  console.log(`drykit v${pkg.version} — prevent AI from creating duplicate components

Usage: drykit <command> [options]

Commands:
  init          Initialize drykit in current project
  scan          Scan project and update registry + fingerprint
  add <Name>    Add/register a component
  check [--ci]  Validate registry (unregistered files, duplicates)
  docs          Generate COMPONENTS.md from registry

Options:
  --version     Show version
  --help        Show this help`);
  process.exit(0);
}

if (!COMMANDS.includes(command)) {
  console.error(`Unknown command: ${command}\nRun drykit --help for usage.`);
  process.exit(1);
}

try {
  const mod = await import(`../src/commands/${command}.mjs`);
  await mod.default(args);
} catch (err) {
  console.error(`Error: ${err.message}`);
  process.exit(1);
}
```

- [ ] **Step 2: Test all commands end-to-end**

Run each in sequence:
```bash
node bin/drykit.mjs --version
node bin/drykit.mjs --help
node bin/drykit.mjs init    # (interactive — test manually)
node bin/drykit.mjs scan
node bin/drykit.mjs check
node bin/drykit.mjs docs
node bin/drykit.mjs add TestComponent --force
node bin/drykit.mjs check --ci
```

Expected: All commands run without errors.

- [ ] **Step 3: Commit**

```bash
git add bin/drykit.mjs
git commit -m "feat: finalize CLI entry point with version, help, error handling"
```

---

## Task 16: End-to-End Integration Test

**Files:**
- Create: `tests/e2e.test.mjs`

- [ ] **Step 1: Write integration test**

```js
// tests/e2e.test.mjs
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { runInit } from '../src/commands/init.mjs';

const TMP = path.join(import.meta.dirname, '__tmp_e2e');
const BIN = path.join(import.meta.dirname, '..', 'bin', 'drykit.mjs');

describe('e2e', () => {
  before(() => {
    fs.mkdirSync(path.join(TMP, 'src', 'components'), { recursive: true });
    // Create a component
    fs.writeFileSync(path.join(TMP, 'src', 'components', 'Modal.tsx'),
      `import React from 'react';\ninterface ModalProps {\n  open: boolean;\n  variant: 'primary' | 'form';\n  title: string;\n}\nexport function Modal(props: ModalProps) { return null; }\n`);
  });

  after(() => fs.rmSync(TMP, { recursive: true, force: true }));

  it('init → scan → check → docs full pipeline', async () => {
    // Init (non-interactive via runInit with answers)
    await runInit({
      root: TMP,
      answers: {
        projectName: 'test-app',
        stack: 'React 19',
        css: 'Tailwind 4',
        typescript: true,
        ai: 'both',
        componentsDir: 'src/components',
      },
    });

    assert.ok(fs.existsSync(path.join(TMP, 'drykit.config.mjs')));
    assert.ok(fs.existsSync(path.join(TMP, 'src', 'registry.json')));

    // Scan
    const scanOut = execSync(`node ${BIN} scan`, { cwd: TMP, encoding: 'utf8' });
    assert.ok(scanOut.includes('Registry'));

    const reg = JSON.parse(fs.readFileSync(path.join(TMP, 'src', 'registry.json'), 'utf8'));
    assert.ok(reg.components.length >= 1);

    // Check (should pass — Modal is registered)
    const checkOut = execSync(`node ${BIN} check`, { cwd: TMP, encoding: 'utf8' });
    assert.ok(checkOut.includes('clean'));

    // Add new component
    execSync(`node ${BIN} add InfoCard --force`, { cwd: TMP, encoding: 'utf8' });
    assert.ok(fs.existsSync(path.join(TMP, 'src', 'components', 'InfoCard.tsx')));

    // Docs
    execSync(`node ${BIN} docs`, { cwd: TMP, encoding: 'utf8' });
    assert.ok(fs.existsSync(path.join(TMP, 'docs', 'COMPONENTS.md')));

    // Fingerprint files exist and have content
    const fp = fs.readFileSync(path.join(TMP, '.drykit', 'fingerprint.md'), 'utf8');
    assert.ok(fp.includes('Routing'));
    const front = fs.readFileSync(path.join(TMP, '.drykit', 'front.md'), 'utf8');
    assert.ok(front.includes('Modal'));
  });
});
```

- [ ] **Step 2: Run e2e test**

Run: `node --test tests/e2e.test.mjs`
Expected: PASS.

- [ ] **Step 3: Run full test suite**

Run: `node --test tests/**/*.test.mjs`
Expected: All tests PASS.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e.test.mjs
git commit -m "test: end-to-end integration test — init → scan → check → add → docs"
```

---

## Task 17: Final Polish

**Files:**
- Modify: `package.json` — verify all fields
- Create: `README.md` (minimal)

- [ ] **Step 1: Verify `package.json` is complete**

Ensure `bin`, `files`, `engines`, `keywords`, `description` are all correct. Run `npm pack --dry-run` to verify published files.

- [ ] **Step 2: Create minimal `README.md`**

```markdown
# drykit

CLI tool that prevents AI (Claude Code, Kiro) from creating duplicate components in React projects.

## Quick Start

\`\`\`bash
npx drykit init
drykit scan
\`\`\`

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
```

- [ ] **Step 3: Final commit**

```bash
git add package.json README.md
git commit -m "docs: README + final package.json polish"
```
