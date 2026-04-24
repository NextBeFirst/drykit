export function componentTemplate({ name, typescript = true }) {
  if (typescript) {
    return `interface ${name}Props {
  // TODO: define props
}

export function ${name}(props: ${name}Props) {
  return <div>${name}</div>;
}
`;
  }
  return `export function ${name}(props) {
  return <div>${name}</div>;
}
`;
}
