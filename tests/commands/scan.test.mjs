import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { runScan } from '../../src/commands/scan.mjs';

const TMP = path.join(import.meta.dirname, '__tmp_scan');

describe('scan', () => {
  before(() => {
    fs.mkdirSync(path.join(TMP, 'src', 'components'), { recursive: true });
    fs.mkdirSync(path.join(TMP, 'src', 'hooks'), { recursive: true });
    fs.mkdirSync(path.join(TMP, '.drykit'), { recursive: true });

    // config
    fs.writeFileSync(path.join(TMP, 'drykit.config.mjs'),
      `export default { scan: { components: ['src/components/**/*.tsx'], hooks: ['src/hooks/**/*.ts'], utils: [], routes: ['src/routes/**/*.ts'], schemas: ['src/schemas/**/*.ts'] }, registry: 'src/registry.json', docs: 'docs/components', dryRisk: ['Modal'], lang: 'en' };\n`);

    // empty registry
    fs.writeFileSync(path.join(TMP, 'src', 'registry.json'),
      JSON.stringify({ version: '1', generatedAt: '', components: [], hooks: [], utils: [], routes: [], schemas: [] }, null, 2));

    // sample component
    fs.writeFileSync(path.join(TMP, 'src', 'components', 'Modal.tsx'),
      `import React from 'react';\ninterface ModalProps {\n  open: boolean;\n  variant: 'primary' | 'form';\n}\nexport function Modal(props: ModalProps) { return null; }\n`);

    // sample hook
    fs.writeFileSync(path.join(TMP, 'src', 'hooks', 'useAuth.ts'),
      `import { useState } from 'react';\nexport function useAuth() { return useState(null); }\n`);

    // sample route
    fs.mkdirSync(path.join(TMP, 'src', 'routes'), { recursive: true });
    fs.writeFileSync(path.join(TMP, 'src', 'routes', 'users.ts'),
      `import { z } from 'zod';\nexport const usersRouter = {\n  profile: { method: 'query' },\n  update: { method: 'mutation' },\n};\n`);

    // sample schema
    fs.mkdirSync(path.join(TMP, 'src', 'schemas'), { recursive: true });
    fs.writeFileSync(path.join(TMP, 'src', 'schemas', 'user.ts'),
      `import { z } from 'zod';\nexport const UserSchema = z.object({ id: z.string(), email: z.string() });\n`);

    // AGENTS.md with markers
    fs.writeFileSync(path.join(TMP, 'AGENTS.md'),
      `# Project\n<!-- REGISTRY:START -->\nold\n<!-- REGISTRY:END -->\n`);

    // fingerprint stubs
    fs.writeFileSync(path.join(TMP, '.drykit', 'fingerprint.md'), '');
    fs.writeFileSync(path.join(TMP, '.drykit', 'front.md'), '');
    fs.writeFileSync(path.join(TMP, '.drykit', 'api.md'), '');
  });

  after(() => fs.rmSync(TMP, { recursive: true, force: true }));

  it('populates registry from scanned files', async () => {
    await runScan({ root: TMP });
    const reg = JSON.parse(fs.readFileSync(path.join(TMP, 'src', 'registry.json'), 'utf8'));
    assert.equal(reg.components.length, 1);
    assert.equal(reg.components[0].name, 'Modal');
    assert.deepStrictEqual(reg.components[0].variants, ['primary', 'form']);
    assert.equal(reg.hooks.length, 1);
    assert.equal(reg.hooks[0].name, 'useAuth');
    assert.ok(reg.routes.length >= 1);
    assert.ok(reg.schemas.length >= 1);
  });

  it('generates fingerprint files', async () => {
    await runScan({ root: TMP });
    const fp = fs.readFileSync(path.join(TMP, '.drykit', 'fingerprint.md'), 'utf8');
    assert.ok(fp.includes('Routing'));
    const front = fs.readFileSync(path.join(TMP, '.drykit', 'front.md'), 'utf8');
    assert.ok(front.includes('Modal'));
    assert.ok(front.includes('useAuth'));
  });

  it('updates AGENTS.md registry block', async () => {
    await runScan({ root: TMP });
    const agents = fs.readFileSync(path.join(TMP, 'AGENTS.md'), 'utf8');
    assert.ok(agents.includes('components'));
    assert.ok(!agents.includes('old'));
  });
});
