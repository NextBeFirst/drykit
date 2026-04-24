export function kiroSteeringAlways() {
  return `---
inclusion: always
name: drykit-registry
description: Component registry and DRY workflow rules
---

Read \`.drykit/fingerprint.md\` at the start of every session.
Before creating any component, hook, or utility — check if it already exists.
If fingerprint routes you to \`front.md\` or \`api.md\` — read that file.

Rules:
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
