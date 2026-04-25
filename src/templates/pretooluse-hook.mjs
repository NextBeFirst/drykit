export function preToolUseHookTemplate() {
  return `#!/usr/bin/env node
// drykit PreToolUse hook — blocks writes to components/ if duplicate detected
// Install: add to .claude/hooks/ or reference in .claude/settings.json

import { execSync } from 'node:child_process';

const input = JSON.parse(process.argv[2] || '{}');
const { tool, params } = input;

// Only check Write/Edit to component files
if ((tool === 'Write' || tool === 'Edit') && params?.file_path) {
  const fp = params.file_path.replace(/\\\\/g, '/');
  if (fp.includes('/components/') || fp.includes('/hooks/') || fp.includes('/utils/')) {
    try {
      execSync('npx drykit check --ci', { stdio: 'pipe' });
    } catch (e) {
      const output = e.stdout?.toString() || '';
      if (output.includes('duplicate') || output.includes('⚠')) {
        console.error('⛔ drykit: potential duplicate detected. Check registry before creating.');
        console.error(output);
        process.exit(1);
      }
    }
  }
}

process.exit(0);
`;
}
