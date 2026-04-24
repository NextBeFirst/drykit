export function schemaTemplate() {
  return JSON.stringify({
    "$schema": "http://json-schema.org/draft-07/schema#",
    type: "object",
    required: ["version", "components"],
    properties: {
      version: { type: "string" },
      generatedAt: { type: "string" },
      components: { type: "array", items: { "$ref": "#/definitions/entry" } },
      hooks: { type: "array", items: { "$ref": "#/definitions/entry" } },
      utils: { type: "array", items: { "$ref": "#/definitions/entry" } },
      routes: { type: "array" },
      schemas: { type: "array" },
    },
    definitions: {
      entry: {
        type: "object",
        required: ["name", "path"],
        properties: {
          name: { type: "string" },
          path: { type: "string" },
          variants: { type: "array", items: { type: "string" } },
          props: { type: "object" },
          usage: { type: "string" },
          dependencies: { type: "array", items: { type: "string" } },
          dateCreated: { type: "string" },
          lastModified: { type: "string" },
          status: { type: "string", enum: ["beta", "stable", "deprecated"] },
        },
      },
    },
  }, null, 2) + '\n';
}
