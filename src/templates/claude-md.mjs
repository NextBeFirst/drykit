export function claudeMdDrykitSection({ projectName }) {
  return `## drykit — Component Registry

Read \`.drykit/fingerprint.md\` at the start of every session.
Before creating any component, hook, or utility — check if it already exists.
If fingerprint routes you to \`front.md\` or \`api.md\` — read that file.

### Rules
- NEVER create a component without checking the registry
- If a component exists with variants — use a variant, don't create new
- If you must create new — run: drykit add <Name>
- After creating — verify registry.json was updated

### Model Routing

When performing drykit-related tasks, delegate to cheaper models:

- Registry lookup, web search, file scan, duplicate check
  → spawn Agent with model: "haiku"
- Component scaffold, code generation, code review
  → spawn Agent with model: "sonnet"
- Architecture analysis, planning, complex refactoring
  → use main session context (don't delegate)

### Component Library Status

<!-- REGISTRY:START -->
_(run \`drykit scan\` to populate)_
<!-- REGISTRY:END -->
`;
}
