export function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function containsDryRisk(name, keywords) {
  const lower = name.toLowerCase();
  return keywords.some(k => lower.includes(k.toLowerCase()));
}

export function findDuplicates(entries, dryRiskKeywords = []) {
  const dupes = [];
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const a = entries[i].name;
      const b = entries[j].name;
      const dist = levenshtein(a.toLowerCase(), b.toLowerCase());
      const maxLen = Math.max(a.length, b.length);
      const ratio = dist / maxLen;
      const oneContainsOther = a.toLowerCase().includes(b.toLowerCase()) || b.toLowerCase().includes(a.toLowerCase());
      const bothDryRisk = containsDryRisk(a, dryRiskKeywords) && containsDryRisk(b, dryRiskKeywords);
      if (oneContainsOther || (ratio < 0.4 && bothDryRisk)) {
        const existing = entries[i].variants?.length ? entries[i] : entries[j];
        dupes.push({
          a: entries[i].name,
          b: entries[j].name,
          distance: dist,
          suggestion: existing.variants?.length
            ? `${existing.name} has variants [${existing.variants.join(', ')}] — consider adding a variant instead`
            : `Consider merging into one component with variants`,
        });
      }
    }
  }
  return dupes;
}

export function findUnregistered(filePaths, registeredEntries) {
  const normalize = p => p.replace(/\\/g, '/');
  const registered = new Set(registeredEntries.map(e => normalize(e.path)));
  return filePaths.filter(f => !registered.has(normalize(f)));
}
