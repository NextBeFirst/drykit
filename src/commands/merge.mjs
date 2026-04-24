import fs from 'node:fs';
import path from 'node:path';
import { loadConfig } from '../core/config.mjs';
import { loadRegistry, saveRegistry, findEntry } from '../core/registry.mjs';

export async function runMerge({ root = process.cwd(), names = [], force = false } = {}) {
  if (names.length < 2) {
    console.error('Usage: drykit merge <Component1> <Component2> [Component3...]\nExample: drykit merge Modal ConfirmModal BaseModal');
    return;
  }

  const config = await loadConfig(root);
  const regPath = path.join(root, config.registry);
  const reg = loadRegistry(regPath);

  // Find all entries
  const entries = names.map(name => {
    const entry = findEntry(reg, name);
    if (!entry) console.warn(`⚠  Not found in registry: ${name}`);
    return entry;
  }).filter(Boolean);

  if (entries.length < 2) {
    console.error('Need at least 2 registered components to merge.');
    return;
  }

  // Show what will be merged
  console.log('\n📦 Components to merge:\n');
  for (const e of entries) {
    const vars = e.variants?.length ? ` [${e.variants.join(', ')}]` : ' [no variants]';
    console.log(`  • ${e.name}${vars}`);
    console.log(`    ${e.path}`);
  }

  // Determine base (most variants = most complete)
  const base = entries.reduce((a, b) => (a.variants?.length || 0) >= (b.variants?.length || 0) ? a : b);
  const others = entries.filter(e => e.name !== base.name);

  console.log(`\n✦ Base component: ${base.name} (will keep this, absorb others)`);
  console.log(`  Merging into it: ${others.map(e => e.name).join(', ')}\n`);

  if (!force) {
    const prompts = (await import('prompts')).default;
    const { confirm } = await prompts({
      type: 'confirm',
      name: 'confirm',
      message: `Merge ${others.map(e => e.name).join(', ')} → ${base.name}? This will update the registry and optionally delete merged files.`,
      initial: false,
    });
    if (!confirm) { console.log('Aborted.'); return; }
  }

  // Collect all unique variants
  const allVariants = [...new Set([
    ...(base.variants || []),
    ...others.flatMap(e => e.variants || []),
    // Add lowercase names of merged components as variant suggestions
    ...others.map(e => e.name.replace(base.name, '').toLowerCase()).filter(v => v.length > 0),
  ])];

  // Update base entry in registry
  const kind = 'components';
  const baseIdx = reg[kind].findIndex(e => e.name === base.name);
  if (baseIdx >= 0) {
    reg[kind][baseIdx] = {
      ...reg[kind][baseIdx],
      variants: allVariants,
      lastModified: new Date().toISOString().slice(0, 10),
    };
  }

  // Remove merged entries from registry
  for (const other of others) {
    reg[kind] = reg[kind].filter(e => e.name !== other.name);
  }

  saveRegistry(regPath, reg);
  console.log(`✓ Registry updated — ${base.name} now has variants: [${allVariants.join(', ')}]`);
  console.log(`✓ Removed from registry: ${others.map(e => e.name).join(', ')}`);

  // Offer to delete merged files
  if (!force) {
    const prompts = (await import('prompts')).default;
    for (const other of others) {
      const absPath = path.join(root, other.path);
      if (!fs.existsSync(absPath)) continue;
      const { del } = await prompts({
        type: 'confirm',
        name: 'del',
        message: `Delete ${other.path}?`,
        initial: false,
      });
      if (del) {
        fs.rmSync(absPath);
        console.log(`✓ Deleted ${other.path}`);
      }
    }
  }

  console.log(`\n✓ Merge complete. Run: drykit scan — to rebuild fingerprint.`);
}

export default async function merge(args) {
  const force = args.includes('--force');
  const names = args.filter(a => !a.startsWith('--'));
  await runMerge({ names, force });
}
