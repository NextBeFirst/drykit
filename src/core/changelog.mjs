import { execFileSync } from 'node:child_process';

export function parseGitLog(raw) {
  return raw.trim().split('\n')
    .filter(l => l.trim())
    .map(line => {
      const spaceIdx = line.indexOf(' ');
      return { hash: line.slice(0, spaceIdx), message: line.slice(spaceIdx + 1) };
    });
}

export function getRecentCommits(scanPaths, days = 7, cwd = process.cwd()) {
  try {
    const args = ['log', '--oneline', `--since=${days} days`, '--name-only', '--'];
    args.push(...scanPaths);
    const log = execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    const commits = [];
    let current = null;
    for (const line of log.split('\n')) {
      if (!line.trim()) continue;
      const commitMatch = line.match(/^([a-f0-9]{7,}) (.+)$/);
      if (commitMatch) {
        if (current) commits.push(current);
        current = { hash: commitMatch[1], message: commitMatch[2], files: [] };
      } else if (current) {
        current.files.push(line.trim());
      }
    }
    if (current) commits.push(current);
    return commits;
  } catch {
    return [];
  }
}

export function mapCommitsToRegistry(commits, registry) {
  const allEntries = [
    ...registry.components,
    ...registry.hooks,
    ...registry.utils,
    ...(registry.routes || []),
    ...(registry.schemas || []),
  ];
  const pathToName = new Map(allEntries.map(e => [e.path, e.name]));

  const changed = new Map();
  for (const c of commits) {
    for (const file of (c.files || [])) {
      const name = pathToName.get(file);
      if (!name) continue;
      const isNew = c.message.match(/\b(add|feat|new|create)\b/i);
      const prefix = isNew ? '+' : '~';
      const key = `${prefix}${name}`;
      if (!changed.has(key)) changed.set(key, c.message);
    }
  }

  return [...changed.keys()].map(k => k);
}
