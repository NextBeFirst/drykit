#!/usr/bin/env node
/**
 * register-component.mjs
 *
 * Add a component / hook / util to src/registry.json.
 *
 * Usage:
 *   node scripts/register-component.mjs <Name> <path> [--kind=component|hook|util]
 *   node scripts/register-component.mjs --find <query>
 *
 * Extracts:
 *   - imports as dependencies
 *   - props from the first `interface <Name>Props` / `type <Name>Props`
 *   - variant values if `variant: '...' | '...'` is present in the props type
 *
 * Writes:
 *   - registry entry (merges if name+path already exists)
 *   - src/docs/<Name>.md stub (if absent)
 */

import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const REGISTRY = path.join(ROOT, 'src', 'registry.json');
const DOCS_DIR = path.join(ROOT, 'src', 'docs');

function loadRegistry() {
  const raw = fs.readFileSync(REGISTRY, 'utf8');
  return JSON.parse(raw);
}

function saveRegistry(data) {
  data.generatedAt = new Date().toISOString();
  fs.writeFileSync(REGISTRY, JSON.stringify(data, null, 2) + '\n');
}

function extractImports(src) {
  const deps = new Set();
  const re = /^\s*import\s+(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]/gm;
  let m;
  while ((m = re.exec(src))) {
    const pkg = m[1];
    // skip css/style side-effect imports
    if (pkg.endsWith('.css') || pkg.endsWith('.scss')) continue;
    deps.add(pkg);
  }
  return [...deps];
}

function extractPropsBlock(src, name) {
  const rx = new RegExp(
    `(?:export\\s+)?(?:interface|type)\\s+${name}Props\\b[^{=]*[={]([\\s\\S]*?)\\n\\}`,
    'm'
  );
  const m = src.match(rx);
  return m ? m[1] : null;
}

function parsePropsBlock(block) {
  if (!block) return {};
  const props = {};
  const lines = block.split('\n');
  for (const line of lines) {
    const m = line.match(/^\s*([a-zA-Z_$][\w$]*)\??\s*:\s*([^;,]+)/);
    if (!m) continue;
    const key = m[1];
    const type = m[2].trim();
    props[key] = type;
  }
  return props;
}

function extractVariants(props) {
  if (!props.variant) return [];
  // matches union of string literals: 'a' | 'b' | "c"
  const matches = [...props.variant.matchAll(/['"]([^'"]+)['"]/g)];
  return matches.map((m) => m[1]);
}

function kindFor(relPath) {
  if (relPath.includes('/hooks/') || /\/use[A-Z]/.test(relPath)) return 'hooks';
  if (relPath.includes('/utils/') || relPath.includes('/lib/')) return 'utils';
  return 'components';
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function registerOne({ name, filePath, kindOverride }) {
  const abs = path.resolve(ROOT, filePath);
  if (!fs.existsSync(abs)) {
    console.error(`\u274C File not found: ${filePath}`);
    process.exit(1);
  }
  const src = fs.readFileSync(abs, 'utf8');
  const relPath = path.relative(ROOT, abs).replaceAll('\\', '/');
  const bucket = kindOverride || kindFor(relPath);

  const propsBlock = extractPropsBlock(src, name);
  const props = parsePropsBlock(propsBlock);
  const variants = extractVariants(props);
  const dependencies = extractImports(src);

  const registry = loadRegistry();
  if (!registry[bucket]) registry[bucket] = [];

  const existing = registry[bucket].find((e) => e.name === name || e.path === relPath);
  const entry = {
    name,
    path: relPath,
    variants,
    props,
    usage: existing?.usage ?? `import { ${name} } from '@/${bucket}/${name}';`,
    dependencies,
    dateCreated: existing?.dateCreated ?? today(),
    lastModified: today(),
    status: existing?.status ?? 'beta',
  };

  if (existing) {
    Object.assign(existing, entry);
    console.log(`\u267B\uFE0F  Updated ${bucket}: ${name} \u2014 ${relPath}`);
  } else {
    // fuzzy warn on similar names before inserting
    const similar = findSimilar(registry[bucket], name);
    if (similar.length) {
      console.log(`\u26A0\uFE0F  Similar entries already exist:`);
      for (const s of similar) console.log(`   - ${s.name} (${s.path})`);
      console.log(`   Consider extending one of those with a new variant instead.`);
    }
    registry[bucket].push(entry);
    console.log(`\u2705 Registered ${bucket}: ${name} \u2014 ${relPath}`);
  }

  saveRegistry(registry);
  ensureDocStub(name, entry);
}

function ensureDocStub(name, entry) {
  fs.mkdirSync(DOCS_DIR, { recursive: true });
  const docPath = path.join(DOCS_DIR, `${name}.md`);
  if (fs.existsSync(docPath)) return;
  const propLines = Object.entries(entry.props)
    .map(([k, v]) => `- \`${k}\`: \`${v}\``)
    .join('\n');
  const variantLines = entry.variants.length
    ? entry.variants.map((v) => `- \`${v}\``).join('\n')
    : '_(none)_';
  const body = `# ${name}

**Path:** \`${entry.path}\`
**Status:** ${entry.status}
**Created:** ${entry.dateCreated}

## Variants

${variantLines}

## Props

${propLines || '_(none detected)_'}

## Usage

\`\`\`tsx
${entry.usage}
\`\`\`

## Notes

_Add behavioral notes, gotchas, and visual examples here._
`;
  fs.writeFileSync(docPath, body);
  console.log(`\uD83D\uDCC4 Wrote stub: ${path.relative(ROOT, docPath)}`);
}

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n; if (!n) return m;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

function findSimilar(bucket, name) {
  const lower = name.toLowerCase();
  return bucket.filter((e) => {
    const en = e.name.toLowerCase();
    if (en === lower) return false;
    if (en.includes(lower) || lower.includes(en)) return true;
    const dist = levenshtein(en, lower);
    return dist <= Math.max(2, Math.floor(Math.max(en.length, lower.length) * 0.3));
  });
}

function find(query) {
  const r = loadRegistry();
  const buckets = ['components', 'hooks', 'utils'];
  let hits = 0;
  for (const b of buckets) {
    const matches = (r[b] || []).filter((e) =>
      e.name.toLowerCase().includes(query.toLowerCase()) ||
      e.path.toLowerCase().includes(query.toLowerCase())
    );
    if (matches.length) {
      console.log(`\n${b.toUpperCase()}`);
      for (const m of matches) {
        const variants = m.variants?.length ? ` [variants: ${m.variants.join(', ')}]` : '';
        console.log(`  ${m.name} \u2014 ${m.path}${variants}`);
      }
      hits += matches.length;
    }
  }
  if (!hits) console.log(`No matches for "${query}".`);
}

// ---- arg parsing ----
const args = process.argv.slice(2);
if (args[0] === '--find') {
  const q = args[1];
  if (!q) { console.error('Usage: register-component.mjs --find <query>'); process.exit(2); }
  find(q);
} else {
  const [name, filePath, ...rest] = args;
  if (!name || !filePath) {
    console.error('Usage: register-component.mjs <Name> <path> [--kind=component|hook|util]');
    process.exit(2);
  }
  const kindFlag = rest.find((a) => a.startsWith('--kind='));
  const kindOverride = kindFlag
    ? { component: 'components', hook: 'hooks', util: 'utils' }[kindFlag.split('=')[1]]
    : null;
  registerOne({ name, filePath, kindOverride });
}
