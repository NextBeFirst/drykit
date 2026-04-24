import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseGitLog, mapCommitsToRegistry } from '../src/core/changelog.mjs';

describe('parseGitLog', () => {
  it('parses oneline git log output', () => {
    const raw = `abc1234 feat: add Modal form variant
def5678 fix: useAuth refresh token
ghi9012 chore: update deps`;
    const commits = parseGitLog(raw);
    assert.equal(commits.length, 3);
    assert.equal(commits[0].hash, 'abc1234');
    assert.ok(commits[0].message.includes('Modal'));
  });

  it('returns empty array for empty input', () => {
    assert.deepStrictEqual(parseGitLog(''), []);
    assert.deepStrictEqual(parseGitLog('  \n  '), []);
  });
});

describe('mapCommitsToRegistry', () => {
  it('maps commits to registry entries by file path', () => {
    const commits = [
      { hash: 'abc', message: 'feat: add form variant', files: ['src/components/Modal.tsx'] },
      { hash: 'def', message: 'fix: refresh', files: ['src/hooks/useAuth.ts'] },
    ];
    const registry = {
      components: [{ name: 'Modal', path: 'src/components/Modal.tsx' }],
      hooks: [{ name: 'useAuth', path: 'src/hooks/useAuth.ts' }],
      utils: [], routes: [], schemas: [],
    };
    const lines = mapCommitsToRegistry(commits, registry);
    assert.ok(lines.some(l => l.includes('Modal')));
    assert.ok(lines.some(l => l.includes('useAuth')));
  });
});
