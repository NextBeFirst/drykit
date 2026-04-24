#!/usr/bin/env node
/**
 * generate-docs.mjs
 *
 * Rebuilds:
 *   - docs/COMPONENTS.md (full listing)
 *   - the <!-- REGISTRY:START -->...<!-- REGISTRY:END --> block in CLAUDE.md
 */

import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const REGISTRY = path.join(ROOT, 'src', 'registry.json');
const DOCS_OUT = path.join(ROOT, 'docs', 'COMPONENTS.md');
const CLAUDE_MD = path.join(ROOT, 'CLAUDE.md');

function renderTable(entries, kindLabel) {
  if (!entries?.length) return `### ${kindLabel}\n\n_(none registered yet)_\n`;
  const rows = entries
    .map((e) => {
      const variants = e.variants?.length ? e.variants.join(', ') : '\u2014';
      return `| \`${e.name}\` | \`${e.path}\` | ${variants} | ${e.status} | ${e.lastModified} |`;
    })
    .join('\n');
  return `### ${kindLabel}\n\n| Name | Path | Variants | Status | Last modified |\n|---|---|---|---|---|\n${rows}\n`;
}

function loadRegistry() {
  return JSON.parse(fs.readFileSync(REGISTRY, 'utf8'));
}

function writeComponentsMd(registry) {
  const parts = [];
  parts.push('# Components Registry\n');
  parts.push(`_Auto-generated from \`src/registry.json\` at ${new Date().toISOString()}._\n`);
  parts.push(renderTable(registry.components, 'Components'));
  parts.push(renderTable(registry.hooks, 'Hooks'));
  parts.push(renderTable(registry.utils, 'Utils'));
  fs.mkdirSync(path.dirname(DOCS_OUT), { recursive: true });
  fs.writeFileSync(DOCS_OUT, parts.join('\n'));
  console.log(`\u2705 Wrote ${path.relative(ROOT, DOCS_OUT)}`);
}

function updateClaudeMd(registry) {
  if (!fs.existsSync(CLAUDE_MD)) {
    console.log(`\u2139\uFE0F  CLAUDE.md missing \u2014 skipping.`);
    return;
  }
  const current = fs.readFileSync(CLAUDE_MD, 'utf8');
  const summary = [];
  summary.push(`_Updated: ${new Date().toISOString().slice(0, 10)}_`);
  summary.push('');
  for (const bucket of ['components', 'hooks', 'utils']) {
    const entries = registry[bucket] || [];
    if (!entries.length) continue;
    summary.push(`**${bucket}** (${entries.length})`);
    summary.push('');
    for (const e of entries) {
      const variants = e.variants?.length ? ` \u2014 variants: ${e.variants.join(', ')}` : '';
      summary.push(`- \`${e.name}\` (${e.status}) \u2014 \`${e.path}\`${variants}`);
    }
    summary.push('');
  }
  if (summary.length === 2) summary.push('_(empty)_');

  const block = summary.join('\n');
  const next = current.replace(
    /<!-- REGISTRY:START -->[\s\S]*?<!-- REGISTRY:END -->/,
    `<!-- REGISTRY:START -->\n${block}\n<!-- REGISTRY:END -->`
  );
  if (next === current) {
    console.log(`\u26A0\uFE0F  No <!-- REGISTRY:START --> block in CLAUDE.md \u2014 skipped.`);
    return;
  }
  fs.writeFileSync(CLAUDE_MD, next);
  console.log(`\u2705 Updated CLAUDE.md registry block`);
}

const registry = loadRegistry();
writeComponentsMd(registry);
updateClaudeMd(registry);
