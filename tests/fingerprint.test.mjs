import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateFingerprint, generateFrontMd, generateApiMd } from '../src/core/fingerprint.mjs';

const sampleRegistry = {
  version: '1',
  generatedAt: '2026-04-24T15:00:00Z',
  components: [
    { name: 'Modal', path: 'src/components/Modal.tsx', variants: ['primary', 'form'], props: { open: 'boolean', variant: "'primary' | 'form'" }, dependencies: ['react', '@/hooks/useAuth'], status: 'beta' },
    { name: 'Button', path: 'src/components/Button.tsx', variants: ['primary', 'ghost'], props: { variant: "'primary' | 'ghost'" }, dependencies: ['react'], status: 'stable' },
  ],
  hooks: [
    { name: 'useAuth', path: 'src/hooks/useAuth.ts', dependencies: ['react'] },
  ],
  utils: [
    { name: 'cn', path: 'src/utils/cn.ts', dependencies: [] },
  ],
  routes: [
    { name: 'users', path: 'src/routes/users.ts', routes: [{ name: 'profile', method: 'query' }, { name: 'update', method: 'mutation' }], dependencies: ['zod'] },
  ],
  schemas: [
    { name: 'UserSchema', path: 'src/schemas/user.ts', fields: ['id', 'email', 'name'], dependencies: ['zod'] },
  ],
};

const sampleConfig = {
  scan: { components: ['src/components/**/*.tsx'], hooks: ['src/hooks/**/*.ts'], utils: ['src/utils/**/*.ts'], routes: ['src/routes/**/*.ts'], schemas: ['src/schemas/**/*.ts'] },
  registry: 'src/registry.json',
  lang: 'en',
};

describe('generateFingerprint', () => {
  it('produces compact markdown with routing section', () => {
    const md = generateFingerprint(sampleRegistry, sampleConfig, 'my-app', 'React 19 + Tailwind 4', []);
    assert.ok(md.includes('my-app'));
    assert.ok(md.includes('Routing'));
    assert.ok(md.includes('front.md'));
    assert.ok(md.includes('api.md'));
    assert.ok(md.includes('Rules'));
  });
});

describe('generateFrontMd', () => {
  it('lists components, hooks, utils with props and variants', () => {
    const md = generateFrontMd(sampleRegistry);
    assert.ok(md.includes('Modal [primary|form]'));
    assert.ok(md.includes('Button [primary|ghost]'));
    assert.ok(md.includes('useAuth'));
    assert.ok(md.includes('cn'));
  });
});

describe('generateApiMd', () => {
  it('lists routes and schemas', () => {
    const md = generateApiMd(sampleRegistry);
    assert.ok(md.includes('profile (query)'));
    assert.ok(md.includes('update (mutation)'));
    assert.ok(md.includes('UserSchema'));
    assert.ok(md.includes('id, email, name'));
  });
});
