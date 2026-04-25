import { loadSavings, getDelta } from '../core/savings.mjs';

export default async function stats(args) {
  const root = process.cwd();
  const s = loadSavings(root);

  if (s.runs === 0) {
    console.log('No drykit runs recorded yet. Run: drykit check or drykit scan');
    return;
  }

  console.log(`\ndrykit stats`);
  console.log(`─────────────────────────────────`);
  console.log(`Runs:                 ${s.runs}`);
  console.log(`Duplicates blocked:   ${s.totalDuplicatesBlocked}`);
  console.log(`Secrets caught:       ${s.totalSecretsBlocked}`);
  console.log(`Unregistered found:   ${s.totalUnregisteredFound}`);
  console.log(`Tokens saved:         ~${(s.estimatedTokensSaved / 1000).toFixed(1)}k (estimate)`);
  console.log(`─────────────────────────────────`);

  const delta = getDelta(s, 7);
  if (delta) {
    const parts = [];
    if (delta.duplicates !== 0) parts.push(`${delta.duplicates > 0 ? '+' : ''}${delta.duplicates} duplicates`);
    if (delta.secrets !== 0) parts.push(`${delta.secrets > 0 ? '+' : ''}${delta.secrets} secrets`);
    if (delta.unregistered !== 0) parts.push(`${delta.unregistered > 0 ? '+' : ''}${delta.unregistered} unregistered`);
    if (parts.length > 0) {
      console.log(`Delta (7d):           ${parts.join(', ')}`);
      console.log(`─────────────────────────────────`);
    }
  }

  console.log(`First run:  ${s.firstRunDate?.slice(0, 10) || '—'}`);
  console.log(`Last run:   ${s.lastRunDate?.slice(0, 10) || '—'}`);
}
