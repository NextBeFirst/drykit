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
  const compCount = registry.components?.length || 0;
  const hookCount = registry.hooks?.length || 0;
  const utilCount = registry.utils?.length || 0;
  const routeCount = registry.routes?.reduce((s, r) => s + (r.routes?.length || 0), 0) || 0;
  const schemaCount = registry.schemas?.length || 0;
  const ts = registry.generatedAt ? registry.generatedAt.slice(0, 10) : new Date().toISOString().slice(0, 10);

  return `_Last scan: ${ts} — ${compCount} components, ${hookCount} hooks, ${utilCount} utils, ${routeCount} routes, ${schemaCount} schemas_

**Read \`.drykit/fingerprint.md\` for the full inventory.**`;
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
