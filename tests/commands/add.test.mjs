import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { runAdd } from '../../src/commands/add.mjs';

const TMP = path.join(import.meta.dirname, '__tmp_add');
const REG = path.join(TMP, 'src', 'registry.json');

describe('add — scaffold mode', () => {
  before(() => {
    fs.mkdirSync(path.join(TMP, 'src', 'components'), { recursive: true });
    fs.mkdirSync(path.join(TMP, '.drykit'), { recursive: true });
    fs.mkdirSync(path.join(TMP, 'docs', 'components'), { recursive: true });
    fs.writeFileSync(path.join(TMP, 'drykit.config.mjs'),
      `export default { scan: { components: ['src/components/**/*.tsx'], hooks: [], utils: [], routes: [], schemas: [] }, registry: 'src/registry.json', docs: 'docs/components', dryRisk: ['Modal'], lang: 'en' };\n`);
  });
  after(() => fs.rmSync(TMP, { recursive: true, force: true }));

  beforeEach(() => {
    fs.writeFileSync(REG, JSON.stringify({ version: '1', generatedAt: '', components: [], hooks: [], utils: [], routes: [], schemas: [] }, null, 2));
  });

  it('scaffolds new component file + registers it', async () => {
    await runAdd({ root: TMP, name: 'ContactForm', force: true });
    assert.ok(fs.existsSync(path.join(TMP, 'src', 'components', 'ContactForm.tsx')));
    const reg = JSON.parse(fs.readFileSync(REG, 'utf8'));
    assert.equal(reg.components.length, 1);
    assert.equal(reg.components[0].name, 'ContactForm');
  });

  it('creates doc stub', async () => {
    await runAdd({ root: TMP, name: 'InfoCard', force: true });
    assert.ok(fs.existsSync(path.join(TMP, 'docs', 'components', 'InfoCard.md')));
  });
});

describe('add — register existing file', () => {
  before(() => {
    fs.mkdirSync(path.join(TMP, 'src', 'components'), { recursive: true });
    fs.writeFileSync(path.join(TMP, 'src', 'components', 'Button.tsx'),
      `import React from 'react';\ninterface ButtonProps { variant: 'primary' | 'ghost'; }\nexport function Button(props: ButtonProps) { return null; }\n`);
    fs.writeFileSync(REG, JSON.stringify({ version: '1', generatedAt: '', components: [], hooks: [], utils: [], routes: [], schemas: [] }, null, 2));
  });

  it('registers existing file by path', async () => {
    await runAdd({ root: TMP, name: 'Button', filePath: 'src/components/Button.tsx', force: true });
    const reg = JSON.parse(fs.readFileSync(REG, 'utf8'));
    assert.equal(reg.components.length, 1);
    assert.equal(reg.components[0].name, 'Button');
    assert.deepStrictEqual(reg.components[0].variants, ['primary', 'ghost']);
  });
});
