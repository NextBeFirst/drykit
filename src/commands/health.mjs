import fs from 'node:fs';
import path from 'node:path';
import { glob } from 'glob';
import { loadConfig } from '../core/config.mjs';
import { loadRegistry } from '../core/registry.mjs';
import { loadSavings } from '../core/savings.mjs';

const LINE_THRESHOLD = 300;
const EXPORT_THRESHOLD = 5;

function countLines(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8').split('\n').length;
  } catch {
    return 0;
  }
}

function countExports(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return (content.match(/\bexport\b/g) || []).length;
  } catch {
    return 0;
  }
}

export default async function health(args) {
  const root = process.cwd();
  const config = await loadConfig(root);
  const regPath = path.join(root, config.registry);
  const reg = loadRegistry(regPath);
  const savings = loadSavings(root);

  const allPatterns = [
    ...config.scan.components,
    ...(config.scan.hooks || []),
    ...(config.scan.utils || []),
    ...(config.scan.routes || []),
    ...(config.scan.schemas || []),
  ];
  const files = await glob(allPatterns, { cwd: root });

  // God-objects: files > LINE_THRESHOLD lines or > EXPORT_THRESHOLD exports
  const godObjects = [];
  for (const f of files) {
    const fullPath = path.join(root, f);
    const lines = countLines(fullPath);
    const exports = countExports(fullPath);
    if (lines > LINE_THRESHOLD || exports > EXPORT_THRESHOLD) {
      godObjects.push({ file: f, lines, exports });
    }
  }

  // Missing docs
  const docsDir = path.join(root, config.docs || 'docs/components');
  const allEntries = [...reg.components, ...reg.hooks, ...reg.utils];
  const missingDocs = [];
  for (const entry of allEntries) {
    const docPath = path.join(docsDir, `${entry.name}.md`);
    if (!fs.existsSync(docPath)) {
      missingDocs.push(entry.name);
    }
  }

  // Registry counts
  const counts = {
    components: reg.components?.length || 0,
    hooks: reg.hooks?.length || 0,
    utils: reg.utils?.length || 0,
  };
  const total = counts.components + counts.hooks + counts.utils;

  // Output
  console.log(`\ndrykit health`);
  console.log(`─────────────────────────────────`);
  console.log(`Registry:       ${total} entries (${counts.components} components, ${counts.hooks} hooks, ${counts.utils} utils)`);
  console.log(`Files scanned:  ${files.length}`);

  if (godObjects.length > 0) {
    console.log(`\n⚠ ${godObjects.length} large file(s) — candidates for splitting:\n`);
    godObjects.sort((a, b) => b.lines - a.lines);
    for (const g of godObjects) {
      const reasons = [];
      if (g.lines > LINE_THRESHOLD) reasons.push(`${g.lines} lines`);
      if (g.exports > EXPORT_THRESHOLD) reasons.push(`${g.exports} exports`);
      console.log(`  ${g.file}  (${reasons.join(', ')})`);
    }
  }

  if (missingDocs.length > 0) {
    console.log(`\n📝 ${missingDocs.length} component(s) without docs:\n`);
    for (const name of missingDocs) {
      console.log(`  ${name}  → run: drykit docs`);
    }
  }

  // Progress
  if (savings.runs > 0) {
    console.log(`\n💡 Progress:`);
    console.log(`  ${savings.totalDuplicatesBlocked} duplicates blocked`);
    console.log(`  ${savings.totalSecretsBlocked} secrets caught`);
    console.log(`  ~${(savings.estimatedTokensSaved / 1000).toFixed(1)}k tokens saved (estimate)`);
    console.log(`  ${savings.runs} runs since ${savings.firstRunDate?.slice(0, 10) || '—'}`);
  }

  if (godObjects.length === 0 && missingDocs.length === 0) {
    console.log(`\n✓ Project looks healthy.`);
  }

  console.log('');
}
