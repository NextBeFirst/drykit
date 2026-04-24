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
  const docsDir = path.join(root, config.docs);
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
