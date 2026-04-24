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

  // Normalize paths to forward slashes for consistent comparison
  const normalizedFiles = files.map(f => f.replace(/\\/g, '/'));

  // All registered entries
  const allEntries = [...reg.components, ...reg.hooks, ...reg.utils];

  // Unregistered
  const unregistered = findUnregistered(normalizedFiles, allEntries);

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
