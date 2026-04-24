import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { runInit } from '../../src/commands/init.mjs';

const TMP = path.join(import.meta.dirname, '__tmp_init');

describe('init (non-interactive)', () => {
  before(() => fs.mkdirSync(TMP, { recursive: true }));
  after(() => fs.rmSync(TMP, { recursive: true, force: true }));

  it('creates all expected files with defaults', async () => {
    await runInit({
      root: TMP,
      answers: {
        projectName: 'test-app',
        stack: 'React 19',
        css: 'Tailwind 4',
        typescript: true,
        ai: 'both',
        componentsDir: 'src/components',
      },
    });

    assert.ok(fs.existsSync(path.join(TMP, 'drykit.config.mjs')));
    assert.ok(fs.existsSync(path.join(TMP, 'src', 'registry.json')));
    assert.ok(fs.existsSync(path.join(TMP, 'src', 'registry.schema.json')));
    assert.ok(fs.existsSync(path.join(TMP, '.drykit', 'fingerprint.md')));
    assert.ok(fs.existsSync(path.join(TMP, '.drykit', 'front.md')));
    assert.ok(fs.existsSync(path.join(TMP, '.drykit', 'api.md')));
    assert.ok(fs.existsSync(path.join(TMP, 'AGENTS.md')));
    assert.ok(fs.existsSync(path.join(TMP, 'CLAUDE.md')));
    assert.ok(fs.existsSync(path.join(TMP, '.kiro', 'steering', 'drykit.md')));
    assert.ok(fs.existsSync(path.join(TMP, '.kiro', 'steering', 'drykit-front.md')));
    assert.ok(fs.existsSync(path.join(TMP, '.kiro', 'agents', 'drykit-scanner.json')));
    assert.ok(fs.existsSync(path.join(TMP, '.kiro', 'agents', 'drykit-architect.json')));
    assert.ok(fs.existsSync(path.join(TMP, '.claude', 'agents', 'drykit-scanner.md')));
    assert.ok(fs.existsSync(path.join(TMP, '.claude', 'agents', 'drykit-architect.md')));
  });

  it('appends to existing CLAUDE.md without overwriting', async () => {
    const tmp2 = path.join(TMP, 'existing');
    fs.mkdirSync(tmp2, { recursive: true });
    fs.writeFileSync(path.join(tmp2, 'CLAUDE.md'), '# My Project\n\nExisting content.\n');

    await runInit({
      root: tmp2,
      answers: { projectName: 'test2', stack: 'Next.js', css: 'none', typescript: true, ai: 'claude', componentsDir: 'src/components' },
    });

    const claude = fs.readFileSync(path.join(tmp2, 'CLAUDE.md'), 'utf8');
    assert.ok(claude.includes('Existing content'));
    assert.ok(claude.includes('drykit'));
    assert.ok(claude.includes('REGISTRY:START'));
  });
});
