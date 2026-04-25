import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateReport } from '../src/core/report.mjs';

const mockData = {
  projectName: 'test-app',
  version: '0.2.0',
  registry: { components: 5, hooks: 2, utils: 3 },
  issues: [
    { rule: 'duplicate', severity: 'error', file: 'src/components/ConfirmModal.tsx', message: 'ConfirmModal ↔ Modal (distance: 0.31)', suggestion: 'Use `<Modal variant="confirmation" />`' },
    { rule: 'unregistered', severity: 'warning', file: 'src/components/Tooltip.tsx', message: 'Tooltip is not in the registry', suggestion: 'Run: drykit add Tooltip src/components/Tooltip.tsx' },
    { rule: 'secret', severity: 'error', file: 'src/utils/api.ts', line: 14, message: 'Stripe Live Key detected (sk_live_****XXXX)', suggestion: 'Move to .env.local as STRIPE_SECRET_KEY' },
  ],
  summary: { unregistered: 1, duplicates: 1, secrets: 1, clean: false },
  inconsistent: [
    { name: 'Button', totalUsages: 12, uniqueCombinations: 6, topPattern: 'size,variant (5x)' },
  ],
};

describe('generateReport', () => {
  it('returns a string', () => {
    const report = generateReport(mockData);
    assert.equal(typeof report, 'string');
  });

  it('includes project name in header', () => {
    const report = generateReport(mockData);
    assert.ok(report.includes('test-app'));
  });

  it('includes summary counts', () => {
    const report = generateReport(mockData);
    assert.ok(report.includes('5'));
    assert.ok(report.includes('Duplicates'));
    assert.ok(report.includes('Secrets'));
    assert.ok(report.includes('Unregistered'));
  });

  it('includes duplicate details', () => {
    const report = generateReport(mockData);
    assert.ok(report.includes('ConfirmModal'));
    assert.ok(report.includes('Modal'));
  });

  it('includes unregistered details', () => {
    const report = generateReport(mockData);
    assert.ok(report.includes('Tooltip'));
    assert.ok(report.includes('drykit add'));
  });

  it('includes secret details', () => {
    const report = generateReport(mockData);
    assert.ok(report.includes('Stripe'));
    assert.ok(report.includes('.env.local'));
  });

  it('includes inconsistent usage section', () => {
    const report = generateReport(mockData);
    assert.ok(report.includes('Button'));
    assert.ok(report.includes('6'));
    assert.ok(report.includes('Inconsistent'));
  });

  it('includes estimate disclaimer', () => {
    const report = generateReport(mockData);
    assert.ok(report.includes('estimate'));
  });

  it('handles clean report', () => {
    const clean = {
      projectName: 'clean-app',
      version: '0.2.0',
      registry: { components: 3, hooks: 1, utils: 1 },
      issues: [],
      summary: { unregistered: 0, duplicates: 0, secrets: 0, clean: true },
      inconsistent: [],
    };
    const report = generateReport(clean);
    assert.ok(report.includes('clean'));
    assert.ok(!report.includes('Top Issues'));
  });
});
