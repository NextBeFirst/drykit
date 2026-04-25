export function claudeSkillTemplate({ projectName }) {
  return `---
name: drykit-registry-check
description: Check component registry before creating any UI component, hook, or utility
inclusion: fileMatch
fileMatchPattern: "src/components/**/*.tsx,src/hooks/**/*.ts,src/utils/**/*.ts"
---

# Drykit — Component Registry Check

Before creating or modifying any component, hook, or utility:

1. Read \`.drykit/fingerprint.md\` — it has the full inventory map
2. If the fingerprint routes you to \`front.md\` or \`api.md\` — read that file
3. Search the registry for existing components that match your intent

## Pre-create check (REQUIRED)

Before writing ANY new file in components/, hooks/, or utils/:

\`\`\`bash
npx drykit check
\`\`\`

If a similar component exists:
- **Use it with a variant** instead of creating new
- Example: \`<Modal variant="confirmation" />\` instead of \`<ConfirmModal />\`

If you must create new:
\`\`\`bash
npx drykit add <Name>
\`\`\`

## Scan check

After reading fingerprint.md, check the stats line (e.g. "3 components, 2 hooks").
If it shows **0 components** or the file doesn't exist:
1. STOP — do not proceed with the task
2. Ask the user: "drykit scan hasn't been run yet (registry is empty). Should I run it now?"
3. If yes → run: \`npx drykit scan\`
4. Re-read \`.drykit/fingerprint.md\` and continue

## Rules
- NEVER create a component without checking the registry
- NEVER create Modal2, ModalNew, ConfirmModal, ModalV2 or similar
- If a component exists with variants — use a variant, don't create new
- After creating — verify registry.json was updated

## Behavioral Guardrails
- Do NOT build, commit, or push without explicit user command
- Do NOT edit files outside the current task scope
- Do NOT add dependencies without asking first
- Check TypeScript types before reporting task as done
- NEVER hardcode API keys, tokens, or passwords — use .env.local
`;
}
