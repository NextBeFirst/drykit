export function docStubTemplate({ name, path: filePath, variants = [], props = {} }) {
  const propList = Object.entries(props).map(([k, v]) => `| \`${k}\` | \`${v}\` | |`).join('\n');
  const variantList = variants.length ? variants.map(v => `- \`${v}\``).join('\n') : '_(none)_';

  return `# ${name}

**Path:** \`${filePath}\`

## Usage

\`\`\`tsx
import { ${name} } from '@/components/${name}';
\`\`\`

## Props

| Prop | Type | Description |
|------|------|-------------|
${propList || '| | | |'}

## Variants

${variantList}
`;
}
