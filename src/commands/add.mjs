import fs from 'node:fs';
import path from 'node:path';
import { loadConfig } from '../core/config.mjs';
import { loadRegistry, saveRegistry, upsertEntry } from '../core/registry.mjs';
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
      console.warn(`\n⚠  STOP — similar components already exist:\n`);
      for (const d of relevant) {
        const other = d.a === name ? d.b : d.a;
        const existing = allEntries.find(e => e.name === other);
        const variants = existing?.variants?.length ? ` [variants: ${existing.variants.join(', ')}]` : '';
        console.warn(`   • ${other}${variants} → ${existing?.path || ''}`);
        console.warn(`     ${d.suggestion}\n`);
      }
      console.warn(`   To proceed anyway, explicitly confirm:`);
      console.warn(`   drykit add ${name} --confirm-duplicate\n`);
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
  const force = args.includes('--force') || args.includes('--confirm-duplicate');
  const filtered = args.filter(a => !a.startsWith('--'));
  const name = filtered[0];
  const filePath = filtered[1];
  if (!name) {
    console.error('Usage: drykit add <Name> [path] [--force]');
    process.exit(1);
  }
  await runAdd({ name, filePath, force });
}
