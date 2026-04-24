import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { runCheck } from '../../src/commands/check.mjs';

const TMP = path.join(import.meta.dirname, '__tmp_check');

// Suppress console output during tests
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

describe('check', () => {
  before(() => {
    fs.mkdirSync(path.join(TMP, 'src', 'components'), { recursive: true });
    fs.writeFileSync(path.join(TMP, 'drykit.config.mjs'),
      `export default { scan: { components: ['src/components/**/*.tsx'], hooks: [], utils: [], routes: [], schemas: [] }, registry: 'src/registry.json', docs: 'docs/components', dryRisk: ['Modal'], lang: 'en' };\n`);

    // Registry with Modal only
    fs.writeFileSync(path.join(TMP, 'src', 'registry.json'),
      JSON.stringify({ version: '1', generatedAt: '', components: [
        { name: 'Modal', path: 'src/components/Modal.tsx', variants: ['primary'], props: {}, dependencies: [] }
      ], hooks: [], utils: [], routes: [], schemas: [] }, null, 2));

    // Two component files — Modal (registered) + Foo (unregistered)
    fs.writeFileSync(path.join(TMP, 'src', 'components', 'Modal.tsx'), 'export function Modal() {}');
    fs.writeFileSync(path.join(TMP, 'src', 'components', 'Foo.tsx'), 'export function Foo() {}');
  });

  after(() => fs.rmSync(TMP, { recursive: true, force: true }));

  it('returns unregistered files', async () => {
    console.log = () => {};
    console.error = () => {};
    console.warn = () => {};
    try {
      const result = await runCheck({ root: TMP, ci: false });
      assert.ok(result.unregistered.length >= 1);
      assert.ok(result.unregistered.some(f => f.includes('Foo')));
    } finally {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
    }
  });

  it('returns exit code 1 in CI mode when unregistered files exist', async () => {
    console.log = () => {};
    console.error = () => {};
    console.warn = () => {};
    try {
      const result = await runCheck({ root: TMP, ci: true });
      assert.equal(result.exitCode, 1);
    } finally {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
    }
  });

  it('returns exit code 0 when all files registered', async () => {
    console.log = () => {};
    console.error = () => {};
    console.warn = () => {};
    try {
      // Register Foo
      const reg = JSON.parse(fs.readFileSync(path.join(TMP, 'src', 'registry.json'), 'utf8'));
      reg.components.push({ name: 'Foo', path: 'src/components/Foo.tsx', variants: [], props: {}, dependencies: [] });
      fs.writeFileSync(path.join(TMP, 'src', 'registry.json'), JSON.stringify(reg, null, 2));

      const result = await runCheck({ root: TMP, ci: true });
      assert.equal(result.exitCode, 0);
    } finally {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
    }
  });
});
