export function preCommitTemplate() {
  return `#!/usr/bin/env sh
set -e

STAGED=$(git diff --cached --name-only --diff-filter=ACMR \\
  -- 'src/components/**' 'src/hooks/**' 'src/utils/**' || true)

if [ -z "$STAGED" ]; then
  exit 0
fi

npx drykit check --ci
`;
}
