export function kiroScannerAgent() {
  return JSON.stringify({
    name: "drykit-scanner",
    description: "Scan project and update component registry",
    model: "claude-haiku-4-5",
    tools: ["read", "write", "bash"],
    prompt: "Run `drykit scan` and report changes. Do NOT modify component files directly.",
  }, null, 2) + '\n';
}

export function kiroArchitectAgent() {
  return JSON.stringify({
    name: "drykit-architect",
    description: "Analyze architecture and suggest improvements",
    model: "claude-sonnet-4",
    tools: ["read", "glob", "grep"],
    resources: ["file://.drykit/**/*.md", "file://registry.json"],
    prompt: "Read .drykit/fingerprint.md and relevant detail files. Analyze component structure. Identify duplications, missing abstractions, unused components. Propose specific refactoring steps.",
  }, null, 2) + '\n';
}
