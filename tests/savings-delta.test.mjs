import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { recordRun, loadSavings, getDelta } from '../src/core/savings.mjs';

describe('delta tracking', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'drykit-delta-'));
    fs.mkdirSync(path.join(tmpDir, '.drykit'), { recursive: true });
  });

  it('recordRun appends to history array', () => {
    recordRun(tmpDir, { duplicates: 3, secrets: 1, unregistered: 2 });
    const s = loadSavings(tmpDir);
    assert.ok(Array.isArray(s.history));
    assert.equal(s.history.length, 1);
    assert.equal(s.history[0].duplicates, 3);
    assert.equal(s.history[0].secrets, 1);
    assert.equal(s.history[0].unregistered, 2);
    assert.ok(s.history[0].date);
  });

  it('multiple runs append multiple history entries', () => {
    recordRun(tmpDir, { duplicates: 1, secrets: 0, unregistered: 0 });
    recordRun(tmpDir, { duplicates: 2, secrets: 1, unregistered: 1 });
    const s = loadSavings(tmpDir);
    assert.equal(s.history.length, 2);
  });

  it('getDelta returns null when no history', () => {
    const s = loadSavings(tmpDir);
    const delta = getDelta(s, 7);
    assert.equal(delta, null);
  });

  it('getDelta returns diff against entry from N days ago', () => {
    const savings = {
      totalDuplicatesBlocked: 10,
      totalSecretsBlocked: 3,
      totalUnregisteredFound: 5,
      history: [
        { date: daysAgo(10), duplicates: 2, secrets: 1, unregistered: 1, totalDuplicates: 4, totalSecrets: 1, totalUnregistered: 2 },
        { date: daysAgo(5), duplicates: 3, secrets: 1, unregistered: 2, totalDuplicates: 7, totalSecrets: 2, totalUnregistered: 4 },
        { date: daysAgo(1), duplicates: 3, secrets: 1, unregistered: 1, totalDuplicates: 10, totalSecrets: 3, totalUnregistered: 5 },
      ],
    };
    const delta = getDelta(savings, 7);
    assert.equal(delta.duplicates, 10 - 4);
    assert.equal(delta.secrets, 3 - 1);
    assert.equal(delta.unregistered, 5 - 2);
  });

  it('getDelta compares against oldest entry if history shorter than N days', () => {
    const savings = {
      totalDuplicatesBlocked: 5,
      totalSecretsBlocked: 1,
      totalUnregisteredFound: 3,
      history: [
        { date: daysAgo(2), duplicates: 2, secrets: 0, unregistered: 1, totalDuplicates: 2, totalSecrets: 0, totalUnregistered: 1 },
        { date: daysAgo(1), duplicates: 3, secrets: 1, unregistered: 2, totalDuplicates: 5, totalSecrets: 1, totalUnregistered: 3 },
      ],
    };
    const delta = getDelta(savings, 7);
    assert.equal(delta.duplicates, 5 - 2);
  });
});

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}
