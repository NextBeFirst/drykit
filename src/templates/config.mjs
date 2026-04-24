export function configTemplate({ componentsDir = 'src/components', hooksDir = 'src/hooks', utilsDir = 'src/utils', routesDir = null, schemasDir = null, projectName = '', stack = '' }) {
  const routes = routesDir
    ? `['${routesDir}/**/*.ts', 'src/app/api/**/*.ts']`
    : `['src/routes/**/*.ts', 'src/app/api/**/*.ts']`;
  const schemas = schemasDir
    ? `['${schemasDir}/**/*.ts']`
    : `['src/schemas/**/*.ts', 'src/types/**/*.ts']`;
  return `// drykit.config.mjs
export default {
  projectName: '${projectName}',
  stack: '${stack}',
  scan: {
    components: ['${componentsDir}/**/*.tsx', '${componentsDir}/**/*.jsx'],
    hooks: ['${hooksDir}/**/*.ts', '${hooksDir}/**/*.tsx'],
    utils: ['${utilsDir}/**/*.ts'],
    routes: ${routes},
    schemas: ${schemas},
  },
  registry: 'src/registry.json',
  docs: 'docs/components',
  dryRisk: ['Modal', 'Form', 'Card', 'Button', 'Dialog', 'Drawer',
            'Toast', 'Dropdown', 'Select', 'Input', 'Table'],
  lang: 'en',
};
`;
}
