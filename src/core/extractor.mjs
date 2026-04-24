import fs from 'node:fs';
import path from 'node:path';

function extractImports(src) {
  const deps = [];
  const re = /^\s*import\s+(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]/gm;
  let m;
  while ((m = re.exec(src))) {
    if (m[1].endsWith('.css') || m[1].endsWith('.scss')) continue;
    deps.push(m[1]);
  }
  return [...new Set(deps)];
}

function extractPropsInterface(src, componentName) {
  const re = new RegExp(
    `(?:interface|type)\\s+${componentName}Props\\s*(?:=\\s*)?\\{([^}]+)\\}`,
    's'
  );
  const m = re.exec(src);
  if (!m) return {};
  const props = {};
  const body = m[1];
  for (const line of body.split('\n')) {
    const pm = line.match(/^\s*(\w+)\s*[?]?\s*:\s*(.+?)\s*;?\s*$/);
    if (pm) props[pm[1]] = pm[2].replace(/\s+/g, ' ').trim();
  }
  return props;
}

function extractVariants(props) {
  const variantType = props.variant;
  if (!variantType) return [];
  const matches = variantType.match(/'([^']+)'/g);
  if (!matches) return [];
  return matches.map(m => m.replace(/'/g, ''));
}

function nameFromFile(filePath) {
  return path.basename(filePath).replace(/\.(tsx?|jsx?)$/, '');
}

function nameFromExport(src) {
  // Prefer PascalCase function/class export (components are PascalCase)
  const m = src.match(/export\s+(?:default\s+)?(?:function|class)\s+([A-Z]\w*)/);
  if (m) return m[1];
  // Fallback: any named export
  const m2 = src.match(/export\s+(?:default\s+)?(?:function|const|class)\s+(\w+)/);
  return m2 ? m2[1] : null;
}

export function extractComponent(filePath) {
  const src = fs.readFileSync(filePath, 'utf8');
  const name = nameFromExport(src) || nameFromFile(filePath);
  const props = extractPropsInterface(src, name);
  return {
    name,
    path: filePath,
    props,
    variants: extractVariants(props),
    dependencies: extractImports(src),
  };
}

export function extractHook(filePath) {
  const src = fs.readFileSync(filePath, 'utf8');
  const name = nameFromExport(src) || nameFromFile(filePath);
  return {
    name,
    path: filePath,
    dependencies: extractImports(src),
  };
}

export function extractRoute(filePath) {
  const src = fs.readFileSync(filePath, 'utf8');
  const routes = [];
  // tRPC-style: key: publicProcedure.query(...) or key: { method: 'query' }
  const procRe = /(\w+)\s*:\s*(?:publicProcedure|protectedProcedure|adminProcedure)\s*\.\s*(query|mutation)/g;
  let m;
  while ((m = procRe.exec(src))) {
    routes.push({ name: m[1], method: m[2] });
  }
  // Fallback: key: { method: 'query' } style
  const objRe = /(\w+)\s*:\s*\{[^}]*?method\s*:\s*['"](\w+)['"]/gs;
  while ((m = objRe.exec(src))) {
    if (!routes.some(r => r.name === m[1])) {
      routes.push({ name: m[1], method: m[2] });
    }
  }
  // Next.js-style: export async function GET/POST
  const handlerRe = /export\s+(?:async\s+)?function\s+(GET|POST|PUT|DELETE|PATCH)/g;
  while ((m = handlerRe.exec(src))) {
    routes.push({ name: path.basename(path.dirname(filePath)), method: m[1].toLowerCase() });
  }
  return { path: filePath, routes, dependencies: extractImports(src) };
}

export function extractSchema(filePath) {
  const src = fs.readFileSync(filePath, 'utf8');
  const schemas = [];
  const re = /export\s+const\s+(\w+Schema)\s*=\s*z\.object\(\{([^}]+)\}\)/gs;
  let m;
  while ((m = re.exec(src))) {
    const fields = [];
    const fieldRe = /(\w+)\s*:/g;
    let fm;
    while ((fm = fieldRe.exec(m[2]))) fields.push(fm[1]);
    schemas.push({ name: m[1], path: filePath, fields, dependencies: extractImports(src) });
  }
  return schemas;
}
