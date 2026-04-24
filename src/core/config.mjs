import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const DEFAULT_CONFIG = {
  scan: {
    components: ['src/components/**/*.tsx', 'components/**/*.tsx'],
    hooks: ['src/hooks/**/*.ts', 'hooks/**/*.ts'],
    utils: ['src/utils/**/*.ts', 'lib/**/*.ts'],
    routes: ['src/routes/**/*.ts', 'src/app/api/**/*.ts'],
    schemas: ['src/schemas/**/*.ts', 'src/types/**/*.ts'],
  },
  registry: 'src/registry.json',
  docs: 'docs/components',
  dryRisk: ['Modal', 'Form', 'Card', 'Button', 'Dialog', 'Drawer',
            'Toast', 'Dropdown', 'Select', 'Input', 'Table'],
  lang: 'en',
  projectName: '',
  stack: '',
};

function deepMerge(target, source) {
  const out = { ...target };
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])
        && target[key] && typeof target[key] === 'object' && !Array.isArray(target[key])) {
      out[key] = deepMerge(target[key], source[key]);
    } else {
      out[key] = source[key];
    }
  }
  return out;
}

export async function loadConfig(root = process.cwd()) {
  const cfgPath = path.join(root, 'drykit.config.mjs');
  if (!fs.existsSync(cfgPath)) return { ...DEFAULT_CONFIG };
  const mod = await import(pathToFileURL(cfgPath).href);
  const user = mod.default || mod;
  return deepMerge(DEFAULT_CONFIG, user);
}
