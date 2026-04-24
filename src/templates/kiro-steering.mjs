export function kiroSteeringAlways() {
  return `---
inclusion: always
name: drykit-registry
description: Component registry and DRY workflow rules
---

Read \`.drykit/fingerprint.md\` at the start of every session.
Before creating any component, hook, or utility — check if it already exists.
If fingerprint routes you to \`front.md\` or \`api.md\` — read that file.

## Scan check (REQUIRED before any UI/component work)

After reading fingerprint.md, check the stats line (e.g. "3 components, 2 hooks").
If it shows **0 components** or the file doesn't exist:
1. STOP — do not proceed with the task
2. Ask the user: "drykit scan hasn't been run yet (registry is empty). Should I run it now?"
3. If yes → run: \`npx drykit scan\`
4. Re-read \`.drykit/fingerprint.md\` and continue

## Rules
- NEVER create a component without checking the registry
- If a component exists with variants — use a variant, don't create new
- If you must create new — run: drykit add <Name>
- After creating — verify registry.json was updated
`;
}

export function kiroSteeringFront() {
  return `---
inclusion: fileMatch
fileMatchPattern: "src/components/**/*.tsx"
name: drykit-frontend
description: Frontend component registry — read before creating UI
---

[auto-generated content from .drykit/front.md — run drykit scan to populate]
`;
}
