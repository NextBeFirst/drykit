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
