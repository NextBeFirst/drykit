#!/usr/bin/env node
const [,, command, ...args] = process.argv;

const COMMANDS = ['init', 'scan', 'add', 'check', 'docs'];

if (!command || command === '--help' || command === '-h') {
  console.log(`drykit — prevent AI from creating duplicate components

Usage: drykit <command> [options]

Commands:
  init          Initialize drykit in current project
  scan          Scan project and update registry + fingerprint
  add <Name>    Add/register a component
  check [--ci]  Validate registry (unregistered files, duplicates)
  docs          Generate COMPONENTS.md from registry`);
  process.exit(0);
}

if (!COMMANDS.includes(command)) {
  console.error(`Unknown command: ${command}\nRun drykit --help for usage.`);
  process.exit(1);
}

const mod = await import(`../src/commands/${command}.mjs`);
await mod.default(args);
