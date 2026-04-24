export function registryTemplate() {
  return JSON.stringify({
    "$schema": "./registry.schema.json",
    version: "1",
    generatedAt: new Date().toISOString(),
    components: [],
    hooks: [],
    utils: [],
    routes: [],
    schemas: [],
  }, null, 2) + '\n';
}
