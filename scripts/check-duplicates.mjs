#!/usr/bin/env node
/**
 * check-duplicates.mjs
 *
 * Two jobs:
 *  1. Walk src/components, src/hooks, src/utils. Every .ts/.tsx file (excluding
 *     index files and barrel-only files) must be referenced by registry.json.
 *  2. Warn when two registered names look like near-duplicates (Levenshtein or
 *     common-prefix + DRY-risk names like "Modal", "Form", "Card").
 *
 * Flags:
 *   --ci   exit 1 on any violation (used by pre-commit hook)
 */

import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const REGISTRY = path.join(ROOT, 'src', 'registry.json');

const SCAN = [
  { dir: 'src/components', bucket: 'components' },
  { dir: 'src/hooks', bucket: 'hooks' },
  { dir: 'src/utils', bucket: 'utils' },
];

const DRY_RISK = ['Modal', 'Form', 'Card', 'Button', 'Dialog', 'Drawer', 'Toast', 'Dropdown', 'Select', 'Input'];
const SKIP_FILES = new Set(['index.ts', 'index.tsx', 'types.ts']);

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (/\.(tsx?|jsx?)$/.test(name) && !name.startsWith('.')) out.push(full);
  }
  return out;
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

function loadRegistry() {
  if (!fs.existsSync(REGISTRY)) {
    console.error(`\u274C Registry missing at ${REGISTRY}. Run: npm install && npm run component:register`);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(REGISTRY, 'utf8'));
}

function main() {
  const isCI = process.argv.includes('--ci');
  const registry = loadRegistry();
  const registered = new Set();
  for (const b of ['components', 'hooks', 'utils']) {
    for (const e of registry[b] || []) {
      registered.add(e.path.replaceAll('\\', '/'));
    }
  }

  const violations = [];
  const warnings = [];

  // 1) unregistered files on disk
  for (const { dir } of SCAN) {
    const abs = path.join(ROOT, dir);
    const files = walk(abs);
    for (const f of files) {
      const rel = path.relative(ROOT, f).replaceAll('\\', '/');
      const base = path.basename(f);
      if (SKIP_FILES.has(base)) continue;
      if (!registered.has(rel)) {
        violations.push({
          type: 'unregistered',
          path: rel,
          fix: `npm run component:register ${path.basename(base, path.extname(base))} ${rel}`,
        });
      }
    }
  }

  // 2) near-duplicate names across the registry
  const allEntries = [
    ...(registry.components || []).map((e) => ({ ...e, bucket: 'components' })),
    ...(registry.hooks || []).map((e) => ({ ...e, bucket: 'hooks' })),
    ...(registry.utils || []).map((e) => ({ ...e, bucket: 'utils' })),
  ];
  for (let i = 0; i < allEntries.length; i++) {
    for (let j = i + 1; j < allEntries.length; j++) {
      const a = allEntries[i], b = allEntries[j];
      const an = a.name.toLowerCase(), bn = b.name.toLowerCase();
      const dist = levenshtein(an, bn);
      const threshold = Math.max(2, Math.floor(Math.max(an.length, bn.length) * 0.25));
      const sharedDry = DRY_RISK.find((k) => a.name.includes(k) && b.name.includes(k));
      if (dist <= threshold || (sharedDry && a.name !== b.name)) {
        warnings.push({
          type: 'near-duplicate',
          a: `${a.name} (${a.path})`,
          b: `${b.name} (${b.path})`,
          reason: sharedDry
            ? `both contain "${sharedDry}" \u2014 consider a variant on one component`
            : `name distance = ${dist}`,
        });
      }
    }
  }

  // 3) print
  if (!violations.length && !warnings.length) {
    console.log('\u2705 Registry clean. No unregistered files, no near-duplicates.');
    return;
  }

  if (violations.length) {
    console.log('\n\u274C Unregistered files:');
    for (const v of violations) {
      console.log(`  - ${v.path}`);
      console.log(`    \u2192 ${v.fix}`);
    }
  }

  if (warnings.length) {
    console.log('\n\u26A0\uFE0F  Potential duplicates:');
    for (const w of warnings) {
      console.log(`  - ${w.a} \u2194 ${w.b}`);
      console.log(`    ${w.reason}`);
    }
  }

  if (isCI && violations.length) {
    console.log('\nCommit blocked. Register the files above, then retry.');
    process.exit(1);
  }
}

main();
