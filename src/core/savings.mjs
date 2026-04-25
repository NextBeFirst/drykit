import fs from 'node:fs';
import path from 'node:path';

const SAVINGS_FILE = '.drykit/savings.json';

function defaultSavings() {
  return {
    totalDuplicatesBlocked: 0,
    totalSecretsBlocked: 0,
    totalUnregisteredFound: 0,
    estimatedTokensSaved: 0,
    runs: 0,
    firstRunDate: null,
    lastRunDate: null,
  };
}

export function loadSavings(root) {
  const fp = path.join(root, SAVINGS_FILE);
  try {
    return JSON.parse(fs.readFileSync(fp, 'utf8'));
  } catch {
    return defaultSavings();
  }
}

export function recordRun(root, { duplicates = 0, secrets = 0, unregistered = 0 } = {}) {
  const savings = loadSavings(root);
  const tokensPerIssue = 700;

  savings.totalDuplicatesBlocked += duplicates;
  savings.totalSecretsBlocked += secrets;
  savings.totalUnregisteredFound += unregistered;
  savings.estimatedTokensSaved += (duplicates + secrets) * tokensPerIssue;
  savings.runs += 1;
  if (!savings.firstRunDate) savings.firstRunDate = new Date().toISOString();
  savings.lastRunDate = new Date().toISOString();

  if (!Array.isArray(savings.history)) savings.history = [];
  savings.history.push({
    date: new Date().toISOString().slice(0, 10),
    duplicates,
    secrets,
    unregistered,
    totalDuplicates: savings.totalDuplicatesBlocked,
    totalSecrets: savings.totalSecretsBlocked,
    totalUnregistered: savings.totalUnregisteredFound,
  });

  const dir = path.join(root, '.drykit');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(root, SAVINGS_FILE), JSON.stringify(savings, null, 2));

  return savings;
}

export function getDelta(savings, days = 7) {
  if (!savings.history || savings.history.length === 0) return null;

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  let baseline = null;
  for (const entry of savings.history) {
    if (entry.date <= cutoffStr) baseline = entry;
  }

  if (!baseline) return null;

  return {
    duplicates: savings.totalDuplicatesBlocked - (baseline.totalDuplicates || 0),
    secrets: savings.totalSecretsBlocked - (baseline.totalSecrets || 0),
    unregistered: savings.totalUnregisteredFound - (baseline.totalUnregistered || 0),
  };
}
