import test from "node:test";

const validationSuites = [
  ["DB mapping and metadata", "../scripts/validate-db-mapping.mjs"],
  ["Core logic and Worker routing", "../scripts/validate-core-logic.mjs"],
  ["API routes", "../scripts/validate-api-routes.mjs"],
  ["MCP tools", "../scripts/validate-mcp-tools.mjs"],
  ["GitHub request cache", "../scripts/validate-github-cache.mjs"],
  ["Quality check CLI", "../scripts/validate-quality-check.mjs"],
  ["Production smoke assertions", "../scripts/validate-smoke-prod.mjs"]
];

for (const [name, modulePath] of validationSuites) {
  test(name, async () => {
    await import(modulePath);
  });
}
