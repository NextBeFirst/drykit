export function configTemplate({ componentsDir = 'src/components', hooksDir = 'src/hooks', utilsDir = 'src/utils', projectName = '', stack = '' }) {
  return `// drykit.config.mjs
export default {
  projectName: '${projectName}',
  stack: '${stack}',
  scan: {
    components: ['${componentsDir}/**/*.tsx', '${componentsDir}/**/*.jsx'],
    hooks: ['${hooksDir}/**/*.ts', '${hooksDir}/**/*.tsx'],
    utils: ['${utilsDir}/**/*.ts'],
    routes: ['src/routes/**/*.ts', 'src/app/api/**/*.ts'],
    schemas: ['src/schemas/**/*.ts', 'src/types/**/*.ts'],
  },
  registry: 'src/registry.json',
  docs: 'docs/components',
  dryRisk: ['Modal', 'Form', 'Card', 'Button', 'Dialog', 'Drawer',
            'Toast', 'Dropdown', 'Select', 'Input', 'Table'],
  lang: 'en',
};
`;
}
