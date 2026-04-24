import fs from 'node:fs';
import path from 'node:path';

const FILES_TO_REMOVE = [
  'drykit.config.mjs',
  'src/registry.json',
  'src/registry.schema.json',
  '.drykit/fingerprint.md',
  '.drykit/front.md',
  '.drykit/api.md',
  'AGENTS.md',
  '.kiro/steering/drykit.md',
  '.kiro/steering/drykit-front.md',
  '.kiro/agents/drykit-scanner.json',
  '.kiro/agents/drykit-architect.json',
  '.claude/agents/drykit-scanner.md',
  '.claude/agents/drykit-architect.md',
];

function removeDrykitSectionFromClaude(filePath) {
  if (!fs.existsSync(filePath)) return false;
  const content = fs.readFileSync(filePath, 'utf8');
  // Remove the ## drykit section (from ## drykit to next ## heading or EOF)
  const updated = content.replace(/\n## drykit[\s\S]*?(?=\n## |\n# |$)/, '');
  if (updated === content) return false;
  fs.writeFileSync(filePath, updated.trimEnd() + '\n');
  return true;
}

function removeDrykitFromHusky(filePath) {
  if (!fs.existsSync(filePath)) return false;
  const content = fs.readFileSync(filePath, 'utf8');
  const updated = content.replace(/\n\n# drykit check\nnpx drykit check --ci\n?/, '');
  if (updated === content) return false;
  fs.writeFileSync(filePath, updated);
  return true;
}

function removeDrykitScripts(filePath) {
  if (!fs.existsSync(filePath)) return false;
  const pkg = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (!pkg.scripts) return false;
  let changed = false;
  for (const key of ['drykit:scan', 'drykit:check', 'drykit:docs']) {
    if (pkg.scripts[key]) { delete pkg.scripts[key]; changed = true; }
  }
  if (!changed) return false;
  fs.writeFileSync(filePath, JSON.stringify(pkg, null, 2) + '\n');
  return true;
}

export async function runEject({ root = process.cwd(), force = false } = {}) {
  const toRemove = FILES_TO_REMOVE.filter(f => fs.existsSync(path.join(root, f)));
  const claudePath = path.join(root, 'CLAUDE.md');
  const huskyPath = path.join(root, '.husky', 'pre-commit');
  const pkgPath = path.join(root, 'package.json');

  if (toRemove.length === 0) {
    console.log('Nothing to remove — drykit files not found.');
    return;
  }

  console.log('\nFiles to remove:');
  for (const f of toRemove) console.log(`  ${f}`);
  console.log('\nSections to clean:');
  if (fs.existsSync(claudePath)) console.log('  CLAUDE.md (## drykit section)');
  if (fs.existsSync(huskyPath)) console.log('  .husky/pre-commit (drykit check lines)');
  if (fs.existsSync(pkgPath)) console.log('  package.json (drykit:* scripts)');

  if (!force) {
    const prompts = (await import('prompts')).default;
    const { confirm } = await prompts({
      type: 'confirm',
      name: 'confirm',
      message: 'Remove all drykit files and config?',
      initial: false,
    });
    if (!confirm) { console.log('Aborted.'); return; }
  }

  for (const f of toRemove) {
    fs.rmSync(path.join(root, f), { force: true });
    console.log(`✓ Removed ${f}`);
  }

  // Remove empty .drykit dir
  const drykitDir = path.join(root, '.drykit');
  if (fs.existsSync(drykitDir) && fs.readdirSync(drykitDir).length === 0) {
    fs.rmdirSync(drykitDir);
  }

  if (removeDrykitSectionFromClaude(claudePath)) console.log('✓ Cleaned CLAUDE.md');
  if (removeDrykitFromHusky(huskyPath)) console.log('✓ Cleaned .husky/pre-commit');
  if (removeDrykitScripts(pkgPath)) console.log('✓ Cleaned package.json scripts');

  console.log('\n✓ drykit removed from project.');
}

export default async function eject(args) {
  const force = args.includes('--force');
  await runEject({ force });
}
