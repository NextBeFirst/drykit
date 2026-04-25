import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { findImportsOf } from '../src/core/extractor.mjs';

const mockFiles = [
  {
    path: 'src/pages/Dashboard.tsx',
    content: `import React from 'react';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';

export default function Dashboard() {
  return <div><Button variant="primary" /><Modal open /></div>;
}`,
  },
  {
    path: 'src/pages/Settings.tsx',
    content: `import React from 'react';
import Button from '../components/Button';

export default function Settings() {
  return <Button size="lg">Save</Button>;
}`,
  },
  {
    path: 'src/components/Header.tsx',
    content: `import React from 'react';
const Button = require('../components/Button');

export function Header() {
  return <header><Button /></header>;
}`,
  },
  {
    path: 'src/utils/helpers.ts',
    content: `// ButtonGroup uses Button internally
export { Button } from '@/components/Button';`,
  },
  {
    path: 'src/pages/About.tsx',
    content: `import React from 'react';
// No Button here, just ButtonGroup
import { ButtonGroup } from '@/components/ButtonGroup';

export default function About() {
  return <ButtonGroup items={[]} />;
}`,
  },
  {
    path: 'node_modules/some-lib/index.js',
    content: `import { Button } from './Button';`,
  },
];

describe('findImportsOf', () => {
  it('finds named imports', () => {
    const results = findImportsOf('Button', mockFiles);
    const files = results.map(r => r.file);
    assert.ok(files.includes('src/pages/Dashboard.tsx'));
  });

  it('finds default imports', () => {
    const results = findImportsOf('Button', mockFiles);
    const files = results.map(r => r.file);
    assert.ok(files.includes('src/pages/Settings.tsx'));
  });

  it('finds require usage', () => {
    const results = findImportsOf('Button', mockFiles);
    const files = results.map(r => r.file);
    assert.ok(files.includes('src/components/Header.tsx'));
  });

  it('finds re-exports', () => {
    const results = findImportsOf('Button', mockFiles);
    const files = results.map(r => r.file);
    assert.ok(files.includes('src/utils/helpers.ts'));
  });

  it('does not match partial names (ButtonGroup vs Button)', () => {
    const results = findImportsOf('Button', mockFiles);
    const files = results.map(r => r.file);
    assert.ok(!files.includes('src/pages/About.tsx'));
  });

  it('skips node_modules', () => {
    const results = findImportsOf('Button', mockFiles);
    const files = results.map(r => r.file);
    assert.ok(!files.includes('node_modules/some-lib/index.js'));
  });

  it('returns file and line number', () => {
    const results = findImportsOf('Button', mockFiles);
    const dashboard = results.find(r => r.file === 'src/pages/Dashboard.tsx');
    assert.ok(dashboard);
    assert.equal(dashboard.line, 2);
  });

  it('returns empty array for unused component', () => {
    const results = findImportsOf('Tooltip', mockFiles);
    assert.deepEqual(results, []);
  });
});
