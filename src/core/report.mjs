export function generateReport({ projectName, version, registry, issues, summary, inconsistent }) {
  const lines = [];
  const date = new Date().toISOString().slice(0, 10);

  lines.push(`# drykit report — ${projectName}`);
  lines.push(`> Generated: ${date} | drykit v${version}`);
  lines.push('');

  if (summary.clean && (!inconsistent || inconsistent.length === 0)) {
    lines.push('## Summary');
    lines.push(`- **Components:** ${registry.components} registered`);
    lines.push(`- **Hooks:** ${registry.hooks} registered`);
    lines.push(`- **Utils:** ${registry.utils} registered`);
    lines.push('');
    lines.push('All clean. No duplicates, secrets, or unregistered files detected.');
    return lines.join('\n');
  }

  const totalIssues = summary.duplicates + summary.secrets + summary.unregistered;
  const tokensEst = (summary.duplicates + summary.secrets) * 700;
  const timeSavedMin = summary.duplicates * 30 + summary.secrets * 45 + (inconsistent ? inconsistent.length * 15 : 0);
  const timeSavedHrs = (timeSavedMin / 60).toFixed(1);

  lines.push('## Summary');
  lines.push(`- **Components:** ${registry.components} registered`);
  lines.push(`- **Duplicates:** ${summary.duplicates} pairs detected`);
  lines.push(`- **Secrets:** ${summary.secrets}`);
  lines.push(`- **Unregistered:** ${summary.unregistered} files`);
  if (inconsistent && inconsistent.length > 0) {
    lines.push(`- **Inconsistent usage:** ${inconsistent.length} component(s) with 3+ unique prop signatures`);
  }
  if (tokensEst > 0) {
    lines.push(`- **Estimated tokens saved:** ~${(tokensEst / 1000).toFixed(1)}k (estimate)`);
  }
  if (timeSavedMin > 0) {
    lines.push(`- **Estimated time saved:** ~${timeSavedHrs}h (estimate — based on ~30min per duplicate, ~45min per secret, ~15min per inconsistent component)`);
  }
  lines.push('');

  if (totalIssues > 0 || (inconsistent && inconsistent.length > 0)) {
    lines.push('## Top Issues');
    lines.push('');
  }

  const dupes = issues.filter(i => i.rule === 'duplicate');
  if (dupes.length > 0) {
    lines.push('### Duplicates');
    lines.push('| File | Detail | Suggestion |');
    lines.push('|---|---|---|');
    for (const d of dupes) {
      lines.push(`| ${d.file} | ${d.message} | ${d.suggestion} |`);
    }
    lines.push('');
  }

  const secrets = issues.filter(i => i.rule === 'secret');
  if (secrets.length > 0) {
    lines.push('### Secrets');
    lines.push('| File | Line | Detail | Suggestion |');
    lines.push('|---|---|---|---|');
    for (const s of secrets) {
      lines.push(`| ${s.file} | ${s.line || '—'} | ${s.message} | ${s.suggestion} |`);
    }
    lines.push('');
  }

  if (inconsistent && inconsistent.length > 0) {
    lines.push('### Inconsistent Usage');
    lines.push('| Component | Usages | Unique Signatures | Top Pattern |');
    lines.push('|---|---|---|---|');
    for (const c of inconsistent) {
      lines.push(`| ${c.name} | ${c.totalUsages} | ${c.uniqueCombinations} | ${c.topPattern} |`);
    }
    lines.push('');
  }

  const unreg = issues.filter(i => i.rule === 'unregistered');
  if (unreg.length > 0) {
    lines.push('### Unregistered');
    lines.push('| File | Suggestion |');
    lines.push('|---|---|');
    for (const u of unreg) {
      lines.push(`| ${u.file} | ${u.suggestion} |`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
