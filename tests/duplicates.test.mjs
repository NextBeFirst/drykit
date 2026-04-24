import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { levenshtein, findDuplicates, findUnregistered } from '../src/core/duplicates.mjs';

describe('levenshtein', () => {
  it('returns 0 for identical strings', () => {
    assert.equal(levenshtein('Modal', 'Modal'), 0);
  });
  it('returns correct distance', () => {
    assert.equal(levenshtein('Modal', 'Model'), 1);
    assert.equal(levenshtein('ConfirmModal', 'Modal'), 7);
  });
});

describe('findDuplicates', () => {
  const entries = [
    { name: 'Modal', path: 'src/components/Modal.tsx', variants: ['primary', 'confirmation'] },
    { name: 'ConfirmModal', path: 'src/components/ConfirmModal.tsx', variants: [] },
    { name: 'Button', path: 'src/components/Button.tsx', variants: [] },
  ];

  it('detects near-duplicate names', () => {
    const dupes = findDuplicates(entries, ['Modal', 'Form', 'Button']);
    assert.ok(dupes.length >= 1);
    assert.ok(dupes.some(d => d.a === 'Modal' && d.b === 'ConfirmModal'));
  });

  it('does not flag unrelated names', () => {
    const dupes = findDuplicates(entries, ['Modal']);
    assert.ok(!dupes.some(d => d.a === 'Button' || d.b === 'Button'));
  });
});

describe('findUnregistered', () => {
  it('returns files not in registry', () => {
    const files = ['src/components/Modal.tsx', 'src/components/Foo.tsx'];
    const registered = [{ path: 'src/components/Modal.tsx' }];
    const unreg = findUnregistered(files, registered);
    assert.deepStrictEqual(unreg, ['src/components/Foo.tsx']);
  });
});
