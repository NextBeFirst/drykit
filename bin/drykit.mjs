#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));

const [,, command, ...args] = process.argv;

if (command === '--version' || command === '-v') {
  console.log(pkg.version);
  process.exit(0);
}

const COMMANDS = ['init', 'scan', 'add', 'check', 'docs', 'eject', 'merge'];

if (!command || command === '--help' || command === '-h') {
  console.log(`drykit v${pkg.version} — prevent AI from creating duplicate components

Usage: drykit <command> [options]

Commands:
  init                    Initialize drykit in current project
  scan                    Scan project and update registry + fingerprint
  add <Name>              Add/register a component
  check [--ci]            Validate registry (unregistered files, duplicates)
  docs                    Generate COMPONENTS.md from registry
  merge <A> <B> [C...]    Merge duplicate components into one
  eject                   Remove all drykit files from project

Options:
  --version     Show version
  --help        Show this help`);
  process.exit(0);
}

if (!COMMANDS.includes(command)) {
  console.error(`Unknown command: ${command}\nRun drykit --help for usage.`);
  process.exit(1);
}

try {
  const mod = await import(`../src/commands/${command}.mjs`);
  await mod.default(args);
} catch (err) {
  console.error(`Error: ${err.message}`);
  process.exit(1);
}
