import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadRegistry, saveRegistry, upsertEntry, findEntry, removeEntry } from '../src/core/registry.mjs';

const TMP = path.join(import.meta.dirname, '__tmp_registry');
const REG = path.join(TMP, 'registry.json');

const EMPTY = { version: '1', generatedAt: '', components: [], hooks: [], utils: [], routes: [], schemas: [] };

describe('registry', () => {
  before(() => fs.mkdirSync(TMP, { recursive: true }));
  after(() => fs.rmSync(TMP, { recursive: true, force: true }));
  beforeEach(() => saveRegistry(REG, EMPTY));

  it('loads and saves registry', () => {
    const reg = loadRegistry(REG);
    assert.equal(reg.version, '1');
    assert.deepStrictEqual(reg.components, []);
  });

  it('upserts a new component entry', () => {
    const reg = loadRegistry(REG);
    const entry = { name: 'Modal', path: 'src/components/Modal.tsx', variants: ['primary'], props: { open: 'boolean' }, dependencies: ['react'] };
    upsertEntry(reg, 'components', entry);
    assert.equal(reg.components.length, 1);
    assert.equal(reg.components[0].name, 'Modal');
  });

  it('updates existing entry by name+path', () => {
    const reg = loadRegistry(REG);
    upsertEntry(reg, 'components', { name: 'Modal', path: 'src/Modal.tsx', variants: ['a'], props: {}, dependencies: [] });
    upsertEntry(reg, 'components', { name: 'Modal', path: 'src/Modal.tsx', variants: ['a', 'b'], props: { x: 'string' }, dependencies: [] });
    assert.equal(reg.components.length, 1);
    assert.deepStrictEqual(reg.components[0].variants, ['a', 'b']);
  });

  it('finds entry by name (case-insensitive)', () => {
    const reg = loadRegistry(REG);
    upsertEntry(reg, 'components', { name: 'Modal', path: 'src/Modal.tsx', variants: [], props: {}, dependencies: [] });
    saveRegistry(REG, reg);
    const found = findEntry(loadRegistry(REG), 'modal');
    assert.equal(found.name, 'Modal');
  });

  it('removes entry by name', () => {
    const reg = loadRegistry(REG);
    upsertEntry(reg, 'components', { name: 'Modal', path: 'src/Modal.tsx', variants: [], props: {}, dependencies: [] });
    removeEntry(reg, 'components', 'Modal');
    assert.equal(reg.components.length, 0);
  });
});
