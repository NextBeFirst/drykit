import fs from 'node:fs';
import path from 'node:path';
import { glob } from 'glob';
import { loadConfig } from '../core/config.mjs';
import { loadRegistry, saveRegistry, upsertEntry } from '../core/registry.mjs';
import { extractComponent, extractHook, extractRoute, extractSchema, findImportsOf, extractCallSiteProps } from '../core/extractor.mjs';
import { generateFingerprint, generateFrontMd, generateApiMd } from '../core/fingerprint.mjs';
import { getRecentCommits, mapCommitsToRegistry } from '../core/changelog.mjs';
import { updateMarkerBlock, generateRegistryBlock, updateSteeringFrontMd } from '../core/updater.mjs';

export async function runScan({ root = process.cwd() } = {}) {
  const config = await loadConfig(root);
  const regPath = path.join(root, config.registry);
  const reg = loadRegistry(regPath);

  const defaultIgnore = ['**/*.test.*', '**/*.spec.*', '**/__mocks__/**', '**/*.stories.*', '**/node_modules/**'];

  // Scan components
  const compFiles = await glob(config.scan.components, { cwd: root, ignore: defaultIgnore });
  for (const f of compFiles) {
    try {
      const data = extractComponent(path.join(root, f));
      data.path = f;
      upsertEntry(reg, 'components', data);
    } catch (e) { console.warn(`⚠ skip ${f}: ${e.message}`); }
  }

  // Scan hooks
  const hookFiles = await glob(config.scan.hooks || [], { cwd: root, ignore: defaultIgnore });
  for (const f of hookFiles) {
    try {
      const data = extractHook(path.join(root, f));
      data.path = f;
      upsertEntry(reg, 'hooks', data);
    } catch (e) { console.warn(`⚠ skip ${f}: ${e.message}`); }
  }

  // Scan utils
  const utilFiles = await glob(config.scan.utils || [], { cwd: root, ignore: defaultIgnore });
  for (const f of utilFiles) {
    try {
      const data = extractHook(path.join(root, f));
      data.path = f;
      upsertEntry(reg, 'utils', data);
    } catch (e) { console.warn(`⚠ skip ${f}: ${e.message}`); }
  }

  // Scan routes
  const routeFiles = await glob(config.scan.routes || [], { cwd: root, ignore: defaultIgnore });
  for (const f of routeFiles) {
    try {
      const data = extractRoute(path.join(root, f));
      data.path = f;
      upsertEntry(reg, 'routes', data);
    } catch (e) { console.warn(`⚠ skip ${f}: ${e.message}`); }
  }

  // Scan schemas
  const schemaFiles = await glob(config.scan.schemas || [], { cwd: root, ignore: defaultIgnore });
  for (const f of schemaFiles) {
    try {
      const results = extractSchema(path.join(root, f));
      for (const s of results) {
        s.path = f;
        upsertEntry(reg, 'schemas', s);
      }
    } catch (e) { console.warn(`⚠ skip ${f}: ${e.message}`); }
  }

  // Save registry
  saveRegistry(regPath, reg);
  const total = reg.components.length + reg.hooks.length + reg.utils.length;
  console.log(`✓ Registry: ${total} entries (${reg.components.length} components, ${reg.hooks.length} hooks, ${reg.utils.length} utils)`);

  // Import tracking — find where each entry is used
  const allScanPatterns = [
    ...config.scan.components,
    ...(config.scan.hooks || []),
    ...(config.scan.utils || []),
    ...(config.scan.routes || []),
    ...(config.scan.schemas || []),
  ];
  const allProjectFiles = await glob(['**/*.{ts,tsx,js,jsx}'], {
    cwd: root,
    ignore: ['node_modules/**', '.drykit/**', '*.test.*', '*.spec.*'],
  });
  const fileContents = allProjectFiles.map(f => {
    try {
      return { path: f.replace(/\\/g, '/'), content: fs.readFileSync(path.join(root, f), 'utf8') };
    } catch { return null; }
  }).filter(Boolean);

  const allEntries = [...reg.components, ...reg.hooks, ...reg.utils];
  for (const entry of allEntries) {
    entry.usedIn = findImportsOf(entry.name, fileContents);
    entry.callSignatures = extractCallSiteProps(entry.name, fileContents);
  }
  saveRegistry(regPath, reg);

  const usedCount = allEntries.filter(e => e.usedIn && e.usedIn.length > 0).length;
  const inconsistent = allEntries.filter(e => e.callSignatures && e.callSignatures.uniqueCombinations >= 3).length;
  console.log(`✓ Import tracking: ${usedCount}/${allEntries.length} entries have usages`);
  if (inconsistent > 0) {
    console.log(`⚠ ${inconsistent} component(s) with 3+ unique prop signatures — check consistency`);
  }

  // Changelog
  const allPaths = [
    ...config.scan.components,
    ...(config.scan.hooks || []),
    ...(config.scan.utils || []),
  ];
  const commits = getRecentCommits(allPaths, 7, root);
  const changedLines = mapCommitsToRegistry(commits, reg);

  // Generate fingerprint files
  const drykitDir = path.join(root, '.drykit');
  fs.mkdirSync(drykitDir, { recursive: true });

  const projectName = config.projectName || path.basename(root);
  const stack = config.stack || '';
  const fpContent = generateFingerprint(reg, config, projectName, stack, changedLines);
  fs.writeFileSync(path.join(drykitDir, 'fingerprint.md'), fpContent);

  const frontContent = generateFrontMd(reg);
  fs.writeFileSync(path.join(drykitDir, 'front.md'), frontContent);

  const apiContent = generateApiMd(reg);
  fs.writeFileSync(path.join(drykitDir, 'api.md'), apiContent);

  console.log('✓ Fingerprint: .drykit/fingerprint.md, front.md, api.md');

  // Update marker blocks in AGENTS.md, CLAUDE.md
  const block = generateRegistryBlock(reg);
  const agentsUpdated = updateMarkerBlock(path.join(root, 'AGENTS.md'), block);
  const claudeUpdated = updateMarkerBlock(path.join(root, 'CLAUDE.md'), block);
  if (agentsUpdated) console.log('✓ Updated AGENTS.md registry block');
  if (claudeUpdated) console.log('✓ Updated CLAUDE.md registry block');

  // Update .kiro/steering/drykit-front.md if exists
  const steeringFront = path.join(root, '.kiro', 'steering', 'drykit-front.md');
  if (fs.existsSync(steeringFront)) {
    updateSteeringFrontMd(steeringFront, frontContent);
    console.log('✓ Updated .kiro/steering/drykit-front.md');
  }
}

export default async function scan(args) {
  await runScan();
}
