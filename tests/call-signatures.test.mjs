import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { extractCallSiteProps } from '../src/core/extractor.mjs';

const mockFiles = [
  {
    path: 'src/pages/Dashboard.tsx',
    content: `import { Button } from '@/components/Button';

export default function Dashboard() {
  return (
    <div>
      <Button variant="primary" size="lg" />
      <Button variant="primary" size="lg" />
      <Button variant="secondary" />
    </div>
  );
}`,
  },
  {
    path: 'src/pages/Settings.tsx',
    content: `import { Button } from '@/components/Button';

export default function Settings() {
  return <Button variant="primary" size="lg" className="mt-4" />;
}`,
  },
  {
    path: 'src/pages/About.tsx',
    content: `import { Modal } from '@/components/Modal';

export default function About() {
  return <Modal open onClose={() => {}} />;
}`,
  },
  {
    path: 'src/pages/Empty.tsx',
    content: `export default function Empty() { return <div />; }`,
  },
];

describe('extractCallSiteProps', () => {
  it('finds all JSX call sites for a component', () => {
    const result = extractCallSiteProps('Button', mockFiles);
    assert.equal(result.totalUsages, 4);
  });

  it('groups unique prop combinations', () => {
    const result = extractCallSiteProps('Button', mockFiles);
    assert.equal(result.uniqueCombinations, 3);
  });

  it('counts top patterns correctly', () => {
    const result = extractCallSiteProps('Button', mockFiles);
    const top = result.topPatterns[0];
    assert.deepEqual(top.props, ['size', 'variant']);
    assert.equal(top.count, 2);
  });

  it('sorts patterns by count descending', () => {
    const result = extractCallSiteProps('Button', mockFiles);
    for (let i = 1; i < result.topPatterns.length; i++) {
      assert.ok(result.topPatterns[i - 1].count >= result.topPatterns[i].count);
    }
  });

  it('returns zero for unused component', () => {
    const result = extractCallSiteProps('Tooltip', mockFiles);
    assert.equal(result.totalUsages, 0);
    assert.equal(result.uniqueCombinations, 0);
    assert.deepEqual(result.topPatterns, []);
  });

  it('does not match partial names', () => {
    const result = extractCallSiteProps('Mod', mockFiles);
    assert.equal(result.totalUsages, 0);
  });
});
