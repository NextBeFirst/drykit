import fs from 'node:fs';

const EMPTY_REGISTRY = {
  version: '1',
  generatedAt: '',
  components: [],
  hooks: [],
  utils: [],
  routes: [],
  schemas: [],
};

export function loadRegistry(filePath) {
  if (!fs.existsSync(filePath)) return structuredClone(EMPTY_REGISTRY);
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

export function saveRegistry(filePath, reg) {
  reg.generatedAt = new Date().toISOString();
  fs.writeFileSync(filePath, JSON.stringify(reg, null, 2) + '\n');
}

export function upsertEntry(reg, kind, entry) {
  const list = reg[kind];
  if (!list) throw new Error(`Unknown kind: ${kind}`);
  const idx = list.findIndex(e => e.name === entry.name && e.path === entry.path);
  const now = new Date().toISOString().slice(0, 10);
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...entry, lastModified: now };
  } else {
    list.push({ ...entry, dateCreated: now, lastModified: now, status: 'beta' });
  }
}

export function findEntry(reg, query) {
  const q = query.toLowerCase();
  for (const kind of ['components', 'hooks', 'utils', 'routes', 'schemas']) {
    const found = reg[kind].find(e =>
      e.name.toLowerCase().includes(q) || (e.path && e.path.toLowerCase().includes(q))
    );
    if (found) return found;
  }
  return null;
}

export function removeEntry(reg, kind, name) {
  reg[kind] = reg[kind].filter(e => e.name !== name);
}

export function createEmptyRegistry() {
  return structuredClone(EMPTY_REGISTRY);
}
