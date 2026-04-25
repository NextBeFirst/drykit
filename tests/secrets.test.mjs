import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { scanFileForSecrets, findSecrets } from '../src/core/secrets.mjs';

const GHP_PREFIX = 'gh' + 'p_';
const FAKE_GH_TOKEN = GHP_PREFIX + '0kI71n3XVHglYvrqlvOKGNgluONUQq0P5qmc';

describe('secrets', () => {
  it('detects Stripe live key', () => {
    const content = `const key = "sk_live_51SSEpbABCDEFGHIJKLMNOP";`;
    const results = scanFileForSecrets(content, 'src/lib/stripe.ts');
    assert.equal(results.length, 1);
    assert.equal(results[0].type, 'Stripe Live Key');
    assert.equal(results[0].line, 1);
    assert.ok(results[0].masked.startsWith('sk_live_'));
    assert.ok(results[0].suggestion.includes('.env.local'));
  });

  it('detects AWS access key', () => {
    const content = `const aws = "AKIARQCNZ77TOK6PAEX3";`;
    const results = scanFileForSecrets(content, 'src/config.ts');
    assert.equal(results.length, 1);
    assert.equal(results[0].type, 'AWS Access Key');
  });

  it('detects GitHub token', () => {
    const content = `const token = "${FAKE_GH_TOKEN}";`;
    const results = scanFileForSecrets(content, 'src/api.ts');
    assert.equal(results.length, 1);
    assert.equal(results[0].type, 'GitHub Token');
  });

  it('detects Google OAuth secret', () => {
    const content = `const secret = "GOCSPX-MvCTU5FWabcdefghijklmnop";`;
    const results = scanFileForSecrets(content, 'src/auth.ts');
    assert.equal(results.length, 1);
    assert.equal(results[0].type, 'Google OAuth Secret');
  });

  it('detects hardcoded password', () => {
    const content = `const password = "Malcolmx8*superSecret";`;
    const results = scanFileForSecrets(content, 'src/db.ts');
    assert.equal(results.length, 1);
    assert.equal(results[0].type, 'Hardcoded Password');
  });

  it('detects generic API key assignment', () => {
    const content = `const api_key = "abcdef1234567890abcdef";`;
    const results = scanFileForSecrets(content, 'src/service.ts');
    assert.equal(results.length, 1);
    assert.equal(results[0].type, 'Generic API Key Assignment');
  });

  it('detects private key block', () => {
    const content = `const cert = "-----BEGIN RSA PRIVATE KEY-----\nMIIE...";`;
    const results = scanFileForSecrets(content, 'src/tls.ts');
    assert.equal(results.length, 1);
    assert.equal(results[0].type, 'Private Key Block');
  });

  it('ignores process.env references', () => {
    const content = `const key = process.env.STRIPE_SECRET_KEY;`;
    const results = scanFileForSecrets(content, 'src/lib/stripe.ts');
    assert.equal(results.length, 0);
  });

  it('ignores import.meta.env references', () => {
    const content = `const key = import.meta.env.VITE_API_KEY;`;
    const results = scanFileForSecrets(content, 'src/config.ts');
    assert.equal(results.length, 0);
  });

  it('ignores comments', () => {
    const content = `// const key = "sk_live_51SSEpbABCDEFGHIJKLMNOP";`;
    const results = scanFileForSecrets(content, 'src/lib/stripe.ts');
    assert.equal(results.length, 0);
  });

  it('ignores .env files', () => {
    const content = `STRIPE_KEY=sk_live_51SSEpbABCDEFGHIJKLMNOP`;
    const results = scanFileForSecrets(content, '.env.local');
    assert.equal(results.length, 0);
  });

  it('ignores test files', () => {
    const content = `const key = "sk_live_51SSEpbABCDEFGHIJKLMNOP";`;
    const results = scanFileForSecrets(content, 'src/lib/stripe.test.ts');
    assert.equal(results.length, 0);
  });

  it('ignores node_modules', () => {
    const content = `const key = "sk_live_51SSEpbABCDEFGHIJKLMNOP";`;
    const results = scanFileForSecrets(content, 'node_modules/stripe/index.js');
    assert.equal(results.length, 0);
  });

  it('ignores markdown files', () => {
    const content = `Example: sk_live_51SSEpbABCDEFGHIJKLMNOP`;
    const results = scanFileForSecrets(content, 'docs/setup.md');
    assert.equal(results.length, 0);
  });

  it('findSecrets aggregates across files', () => {
    const files = [
      { path: 'src/a.ts', content: `const k = "sk_live_51SSEpbABCDEFGHIJKLMNOP";` },
      { path: 'src/b.ts', content: `const a = "AKIARQCNZ77TOK6PAEX3";` },
      { path: 'src/c.ts', content: `const x = process.env.SAFE;` },
    ];
    const results = findSecrets(files);
    assert.equal(results.length, 2);
  });

  it('detects multiple secrets in one file', () => {
    const content = [
      `const stripe = "sk_live_51SSEpbABCDEFGHIJKLMNOP";`,
      `const aws = "AKIARQCNZ77TOK6PAEX3";`,
      `const gh = "${FAKE_GH_TOKEN}";`,
    ].join('\n');
    const results = scanFileForSecrets(content, 'src/config.ts');
    assert.equal(results.length, 3);
    assert.equal(results[0].line, 1);
    assert.equal(results[1].line, 2);
    assert.equal(results[2].line, 3);
  });
});
