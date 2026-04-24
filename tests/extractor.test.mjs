import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { extractComponent, extractHook, extractRoute, extractSchema } from '../src/core/extractor.mjs';

const FIX = path.join(import.meta.dirname, 'fixtures');

describe('extractComponent', () => {
  it('extracts name, props, variants, deps from .tsx', () => {
    const result = extractComponent(path.join(FIX, 'sample-component.tsx'));
    assert.equal(result.name, 'Modal');
    assert.deepStrictEqual(result.variants, ['primary', 'confirmation', 'form']);
    assert.equal(result.props.open, 'boolean');
    assert.equal(result.props.variant, "'primary' | 'confirmation' | 'form'");
    assert.ok(result.dependencies.includes('react'));
    assert.ok(result.dependencies.includes('@/hooks/useAuth'));
  });
});

describe('extractHook', () => {
  it('extracts name and deps from hook file', () => {
    const result = extractHook(path.join(FIX, 'sample-hook.ts'));
    assert.equal(result.name, 'useAuth');
    assert.ok(result.dependencies.includes('react'));
  });
});

describe('extractSchema', () => {
  it('extracts schema name and fields', () => {
    const results = extractSchema(path.join(FIX, 'sample-schema.ts'));
    assert.ok(results.length >= 1);
    assert.equal(results[0].name, 'UserSchema');
    assert.ok(results[0].fields.includes('id'));
    assert.ok(results[0].fields.includes('email'));
  });
});

describe('extractRoute', () => {
  it('extracts route procedures from fixture', () => {
    const result = extractRoute(path.join(FIX, 'sample-route.ts'));
    assert.ok(result.routes.length >= 2);
    assert.ok(result.routes.some(r => r.name === 'profile' && r.method === 'query'));
    assert.ok(result.routes.some(r => r.name === 'update' && r.method === 'mutation'));
  });
});
