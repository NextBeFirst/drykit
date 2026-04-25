import fs from 'node:fs';
import path from 'node:path';
import { glob } from 'glob';
import { loadConfig } from '../core/config.mjs';
import { loadRegistry } from '../core/registry.mjs';
import { findUnregistered, findDuplicates } from '../core/duplicates.mjs';
import { findSecrets } from '../core/secrets.mjs';
import { recordRun, loadSavings, getDelta } from '../core/savings.mjs';
import { generateReport } from '../core/report.mjs';
import { extractCallSiteProps } from '../core/extractor.mjs';

function buildIssues({ unregistered, dupes, secrets, root }) {
  const issues = [];

  for (const f of unregistered) {
    const name = path.basename(f).replace(/\.(tsx?|jsx?)$/, '');
    issues.push({
      rule: 'unregistered',
      severity: 'warning',
      file: f,
      message: `${name} is not in the registry`,
      suggestion: `Run: drykit add ${name} ${f}`,
    });
  }

  for (const d of dupes) {
    const entryA = d.pathA || d.a;
    issues.push({
      rule: 'duplicate',
      severity: 'error',
      file: entryA,
      message: `${d.a} ↔ ${d.b} (distance: ${d.distance})`,
      suggestion: d.suggestion,
    });
  }

  for (const s of secrets) {
    issues.push({
      rule: 'secret',
      severity: 'error',
      file: s.file,
      line: s.line,
      message: `${s.type} detected (${s.masked})`,
      suggestion: s.suggestion,
    });
  }

  return issues;
}

export async function runCheck({ root = process.cwd(), ci = false, json = false, report = false, reportFile = null } = {}) {
  const config = await loadConfig(root);
  const regPath = path.join(root, config.registry);
  const reg = loadRegistry(regPath);

  const allPatterns = [
    ...config.scan.components,
    ...(config.scan.hooks || []),
    ...(config.scan.utils || []),
    ...(config.scan.routes || []),
    ...(config.scan.schemas || []),
  ];
  const files = await glob(allPatterns, { cwd: root });
  const normalizedFiles = files.map(f => f.replace(/\\/g, '/'));

  const allEntries = [...reg.components, ...reg.hooks, ...reg.utils];

  const unregistered = findUnregistered(normalizedFiles, allEntries);
  const dupes = findDuplicates(allEntries, config.dryRisk);

  const fileContents = normalizedFiles.map(f => {
    const fullPath = path.join(root, f);
    try {
      return { path: f, content: fs.readFileSync(fullPath, 'utf8') };
    } catch {
      return null;
    }
  }).filter(Boolean);

  const secrets = findSecrets(fileContents);

  let exitCode = 0;
  if (ci || json) {
    if (secrets.length > 0) exitCode = 2;
    else if (unregistered.length > 0 || dupes.length > 0) exitCode = 1;
  }

  const counts = {
    components: reg.components?.length || 0,
    hooks: reg.hooks?.length || 0,
    utils: reg.utils?.length || 0,
  };

  if (json) {
    const output = {
      registry: counts,
      issues: buildIssues({ unregistered, dupes, secrets, root }),
      summary: {
        unregistered: unregistered.length,
        duplicates: dupes.length,
        secrets: secrets.length,
        clean: unregistered.length === 0 && dupes.length === 0 && secrets.length === 0,
      },
      exitCode,
    };
    console.log(JSON.stringify(output, null, 2));
    return { unregistered, dupes, secrets, exitCode };
  }

  // Markdown report mode
  if (report || reportFile) {
    const inconsistent = allEntries
      .filter(e => e.callSignatures && e.callSignatures.uniqueCombinations >= 3)
      .map(e => ({
        name: e.name,
        totalUsages: e.callSignatures.totalUsages,
        uniqueCombinations: e.callSignatures.uniqueCombinations,
        topPattern: e.callSignatures.topPatterns[0]
          ? `${e.callSignatures.topPatterns[0].props.join(',')} (${e.callSignatures.topPatterns[0].count}x)`
          : '—',
      }));

    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8').toString());
    const md = generateReport({
      projectName: config.projectName || path.basename(root),
      version: pkg.dependencies?.drykit?.replace(/[\^~]/, '') || pkg.version || '0.0.0',
      registry: counts,
      issues: buildIssues({ unregistered, dupes, secrets, root }),
      summary: {
        unregistered: unregistered.length,
        duplicates: dupes.length,
        secrets: secrets.length,
        clean: unregistered.length === 0 && dupes.length === 0 && secrets.length === 0,
      },
      inconsistent,
    });

    if (reportFile) {
      fs.mkdirSync(path.dirname(reportFile), { recursive: true });
      fs.writeFileSync(reportFile, md);
      console.log(`✓ Report written to ${reportFile}`);
    } else {
      console.log(md);
    }

    recordRun(root, { duplicates: dupes.length, secrets: secrets.length, unregistered: unregistered.length });
    return { unregistered, dupes, secrets, exitCode };
  }

  // Human-readable output
  console.log(`\nRegistry:  ${counts.components} components, ${counts.hooks} hooks, ${counts.utils} utils`);

  if (unregistered.length > 0) {
    console.error(`\n✗ ${unregistered.length} unregistered file(s):\n`);
    for (const f of unregistered) {
      const name = path.basename(f).replace(/\.(tsx?|jsx?)$/, '');
      console.error(`  ${f}`);
      console.error(`    → run: drykit add ${name} ${f}\n`);
    }
  }

  if (dupes.length > 0) {
    console.warn(`\n⚠ ${dupes.length} potential duplicate(s):\n`);
    for (const d of dupes) {
      console.warn(`  ${d.a} ↔ ${d.b} (distance: ${d.distance})`);
      console.warn(`    ${d.suggestion}\n`);
    }
  }

  if (secrets.length > 0) {
    console.error(`\n⛔ ${secrets.length} potential secret(s) found in source files:\n`);
    for (const s of secrets) {
      console.error(`  ${s.file}:${s.line}  — ${s.type} (${s.masked})`);
      console.error(`    → ${s.suggestion}\n`);
    }
  }

  if (unregistered.length === 0 && dupes.length === 0 && secrets.length === 0) {
    console.log('✓ Registry clean. No secrets detected.');
  }

  // Token savings estimate
  const tokensPerComponent = 700;
  const caught = dupes.length + secrets.length;
  if (caught > 0) {
    const est = caught * tokensPerComponent;
    console.log(`\n💡 ${caught} issue(s) caught · ~${(est / 1000).toFixed(1)}k tokens not wasted (estimate)`);
  }

  // Record to savings log
  recordRun(root, {
    duplicates: dupes.length,
    secrets: secrets.length,
    unregistered: unregistered.length,
  });

  // Delta
  const savings = loadSavings(root);
  const delta = getDelta(savings, 7);
  if (delta) {
    const total = Math.abs(delta.duplicates) + Math.abs(delta.secrets) + Math.abs(delta.unregistered);
    if (total > 0) {
      const sign = (delta.duplicates + delta.secrets + delta.unregistered) > 0 ? '+' : '';
      console.log(`📈 ${sign}${delta.duplicates + delta.secrets + delta.unregistered} issues since last week (estimate)`);
    }
  }

  return { unregistered, dupes, secrets, exitCode };
}

export default async function check(args) {
  const ci = args.includes('--ci');
  const json = args.includes('--json');
  const report = args.includes('--report');
  const reportFileIdx = args.indexOf('--report-file');
  const reportFile = reportFileIdx !== -1 ? args[reportFileIdx + 1] : null;
  const result = await runCheck({ ci, json, report, reportFile });
  process.exit(result.exitCode);
}
