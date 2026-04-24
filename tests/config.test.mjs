import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadConfig, DEFAULT_CONFIG } from '../src/core/config.mjs';

const TMP = path.join(import.meta.dirname, '__tmp_config');

describe('loadConfig', () => {
  before(() => fs.mkdirSync(TMP, { recursive: true }));
  after(() => fs.rmSync(TMP, { recursive: true, force: true }));

  it('returns defaults when no config file exists', async () => {
    const cfg = await loadConfig(TMP);
    assert.deepStrictEqual(cfg.scan.components, DEFAULT_CONFIG.scan.components);
    assert.equal(cfg.registry, DEFAULT_CONFIG.registry);
    assert.equal(cfg.lang, 'en');
  });

  it('merges user config over defaults', async () => {
    const cfgPath = path.join(TMP, 'drykit.config.mjs');
    fs.writeFileSync(cfgPath, `export default { registry: 'lib/reg.json', lang: 'pl' };\n`);
    const cfg = await loadConfig(TMP);
    assert.equal(cfg.registry, 'lib/reg.json');
    assert.equal(cfg.lang, 'pl');
    // defaults preserved for unset keys
    assert.deepStrictEqual(cfg.scan.components, DEFAULT_CONFIG.scan.components);
    fs.unlinkSync(cfgPath);
  });
});
