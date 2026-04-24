import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execSync, spawnSync } from 'node:child_process';
import { runInit } from '../src/commands/init.mjs';

const TMP = path.join(import.meta.dirname, '__tmp_e2e');
const BIN = path.join(import.meta.dirname, '..', 'bin', 'drykit.mjs');

describe('e2e', () => {
  before(() => {
    fs.mkdirSync(path.join(TMP, 'src', 'components'), { recursive: true });
    // Create a component
    fs.writeFileSync(path.join(TMP, 'src', 'components', 'Modal.tsx'),
      `import React from 'react';\ninterface ModalProps {\n  open: boolean;\n  variant: 'primary' | 'form';\n  title: string;\n}\nexport function Modal(props: ModalProps) { return null; }\n`);
  });

  after(() => fs.rmSync(TMP, { recursive: true, force: true }));

  it('init → scan → check → docs full pipeline', async () => {
    // Init (non-interactive via runInit with answers)
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

    // Scan
    const scanOut = execSync(`node "${BIN}" scan`, { cwd: TMP, encoding: 'utf8' });
    assert.ok(scanOut.includes('Registry'));

    const reg = JSON.parse(fs.readFileSync(path.join(TMP, 'src', 'registry.json'), 'utf8'));
    assert.ok(reg.components.length >= 1);

    // Check (should pass — Modal is registered)
    // Use spawnSync to capture both stdout and stderr
    const checkResult = spawnSync('node', [BIN, 'check'], { cwd: TMP, encoding: 'utf8' });
    const checkAll = (checkResult.stdout || '') + (checkResult.stderr || '');
    assert.ok(checkAll.includes('clean'), `check output: ${checkAll}`);

    // Add new component
    execSync(`node "${BIN}" add InfoCard --force`, { cwd: TMP, encoding: 'utf8' });
    assert.ok(fs.existsSync(path.join(TMP, 'src', 'components', 'InfoCard.tsx')));

    // Docs
    execSync(`node "${BIN}" docs`, { cwd: TMP, encoding: 'utf8' });
    assert.ok(fs.existsSync(path.join(TMP, 'docs', 'COMPONENTS.md')));

    // Fingerprint files exist and have content
    const fp = fs.readFileSync(path.join(TMP, '.drykit', 'fingerprint.md'), 'utf8');
    assert.ok(fp.includes('Routing'));
    const front = fs.readFileSync(path.join(TMP, '.drykit', 'front.md'), 'utf8');
    assert.ok(front.includes('Modal'));
  });
});
