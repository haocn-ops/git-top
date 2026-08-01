import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildAgentDecisionExamples } from "../src/decision-examples.ts";
import { buildAgentDistributionPackage } from "../src/distribution.ts";

const distribution = buildAgentDistributionPackage();
const skill = await readFile(new URL("../skills/git-top-project-selection/SKILL.md", import.meta.url), "utf8");
const interfaceYaml = await readFile(new URL("../skills/git-top-project-selection/agents/openai.yaml", import.meta.url), "utf8");
const registryServer = JSON.parse(await readFile(new URL("../distribution/server.json", import.meta.url), "utf8"));
const packageManifest = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const distributionRunbook = await readFile(new URL("../docs/EXTERNAL_DISTRIBUTION_RUNBOOK.md", import.meta.url), "utf8");
const codexPlugin = JSON.parse(await readFile(new URL("../plugins/git-top/.codex-plugin/plugin.json", import.meta.url), "utf8"));
const claudePlugin = JSON.parse(await readFile(new URL("../plugins/git-top/.claude-plugin/plugin.json", import.meta.url), "utf8"));
const claudeMarketplace = JSON.parse(await readFile(new URL("../.claude-plugin/marketplace.json", import.meta.url), "utf8"));
const pluginMcp = JSON.parse(await readFile(new URL("../plugins/git-top/.mcp.json", import.meta.url), "utf8"));
const pluginSkill = await readFile(new URL("../plugins/git-top/skills/git-top-project-selection/SKILL.md", import.meta.url), "utf8");
const examples = buildAgentDecisionExamples();

assert.equal(distribution.schema_version, "git-top.agent-distribution.v1");
assert.equal(distribution.endpoints.mcp_core, "https://git.top/mcp/core");
assert.equal(distribution.endpoints.mcp_full, "https://git.top/mcp");
assert.equal(distribution.authentication.type, "none");
assert.equal(distribution.authentication.registration_required, false);
assert.deepEqual(distribution.profiles.core.tools, ["search_projects", "get_project", "recommend_project", "get_agent_workflow", "compare_projects"]);
assert.equal(distribution.evidence.production_smoke, "passed");
assert.equal(distribution.evidence.real_client_e2e, "passed");
assert.equal(distribution.evidence.supported_client_count, 2);
assert.deepEqual(distribution.evidence.real_client_e2e_clients.map((client) => client.client), ["Codex CLI, app, and IDE", "Claude Code"]);
assert.ok(distribution.evidence.real_client_e2e_clients.every((client) => client.status === "passed" && client.data_source === "d1"));
assert.equal(distribution.evidence.real_client_e2e_clients[0].not_found_error_code, -32005);
assert.equal(distribution.evidence.real_client_e2e_clients[0].invalid_input_error_code, -32602);
assert.equal(distribution.evidence.real_client_e2e_details.client, "Claude Code");
assert.equal(distribution.evidence.real_client_e2e_details.default_grp_profile, "compact");
assert.equal(distribution.evidence.real_client_e2e_details.compact_result_externalized, false);
assert.equal(distribution.evidence.real_client_e2e_details.data_source, "d1");
assert.equal(distribution.submission_status.canonical_mcp_registry, "active");
assert.equal(distribution.submission_status.github_release, "live");
assert.equal(distribution.submission_status.third_party_catalogs, "live");
assert.equal(distribution.submission_status.smithery, "live");
assert.equal(distribution.submission_status.glama, "live");
assert.equal(distribution.submission_status.client_directories, "partial_live");
assert.equal(distribution.client_directories.codex.status, "blocked_identity_verification");
assert.equal(distribution.client_directories.codex.submission_url, "https://platform.openai.com/plugins");
assert.equal(distribution.client_directories.claude_code.status, "live_repo_marketplace");
assert.equal(distribution.client_directories.claude_code.marketplace_path, ".claude-plugin/marketplace.json");
assert.equal(codexPlugin.name, "git-top");
assert.equal(codexPlugin.mcpServers, "./.mcp.json");
assert.equal(codexPlugin.skills, "./skills/");
assert.equal(codexPlugin.interface.privacyPolicyURL, "https://git.top/privacy");
assert.equal(codexPlugin.interface.termsOfServiceURL, "https://git.top/terms");
assert.equal(claudePlugin.name, "git-top");
assert.equal(claudePlugin.mcpServers["git-top"].url, "https://git.top/mcp/core");
assert.equal(claudeMarketplace.name, "git-top-tools");
assert.equal(claudeMarketplace.plugins[0].source, "./plugins/git-top");
assert.equal(pluginMcp.mcpServers["git-top"].url, "https://git.top/mcp/core");
assert.match(pluginSkill, /^---\nname: git-top-project-selection\ndescription: /);
assert.equal(distribution.submission_artifacts.canonical_mcp_registry.path, "distribution/server.json");
assert.equal(distribution.submission_artifacts.canonical_mcp_registry.server_name, registryServer.name);
assert.equal(distribution.submission_artifacts.canonical_mcp_registry.default_remote, distribution.endpoints.mcp_core);
assert.equal(distribution.submission_artifacts.canonical_mcp_registry.published_version, registryServer.version);
assert.equal(distribution.submission_artifacts.canonical_mcp_registry.status, "active");
assert.match(distribution.submission_artifacts.canonical_mcp_registry.published_at, /^2026-07-31T/);
assert.match(distribution.submission_artifacts.canonical_mcp_registry.registry_api_url, /registry\.modelcontextprotocol\.io/);
assert.equal(distribution.submission_artifacts.github_release.tag_name, "v0.1.0");
assert.equal(distribution.submission_artifacts.github_release.status, "live");
assert.equal(distribution.submission_artifacts.github_release.assets.length, 2);
assert.match(distribution.submission_artifacts.github_release.release_url, /github\.com\/haocn-ops\/git-top\/releases\/tag\/v0\.1\.0/);
assert.deepEqual(
  {
    endpoint: distribution.submission_artifacts.smithery.endpoint,
    website_url: distribution.submission_artifacts.smithery.website_url,
    publish_method: distribution.submission_artifacts.smithery.publish_method
  },
  { endpoint: distribution.endpoints.mcp_core, website_url: distribution.campaign_links.smithery, publish_method: "remote_url" }
);
assert.equal(distribution.submission_artifacts.smithery.listing_url, "https://smithery.ai/servers/izhenghaocn/git-top");
assert.equal(distribution.submission_artifacts.smithery.public_listing_verified, true);
assert.equal(distribution.submission_artifacts.smithery.verified_at, "2026-07-31");
assert.equal(distribution.submission_artifacts.smithery.verification.status, "success");
assert.equal(distribution.submission_artifacts.smithery.verification.deployment, "successful");
assert.equal(distribution.submission_artifacts.smithery.verification.discovered_tool_count, 5);
assert.deepEqual(
  {
    endpoint: distribution.submission_artifacts.glama.endpoint,
    website_url: distribution.submission_artifacts.glama.website_url,
    publish_method: distribution.submission_artifacts.glama.publish_method
  },
  { endpoint: distribution.endpoints.mcp_core, website_url: distribution.campaign_links.glama, publish_method: "remote_connector" }
);
assert.equal(distribution.submission_artifacts.glama.listing_url, "https://glama.ai/mcp/connectors/io.github.haocn-ops/git-top");
assert.equal(distribution.submission_artifacts.glama.server_listing_url, "https://glama.ai/mcp/servers/haocn-ops/git-top");
assert.equal(distribution.submission_artifacts.glama.initial_submission_result, "A server with this URL already exists.");
assert.equal(distribution.submission_artifacts.glama.public_listing_verified, true);
assert.equal(distribution.submission_artifacts.glama.verified_at, "2026-08-01");
assert.equal(distribution.submission_artifacts.glama.verification.status, "healthy");
assert.equal(distribution.submission_artifacts.glama.verification.discovered_tool_count, 5);

assert.equal(registryServer.$schema, "https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json");
assert.equal(registryServer.name, "io.github.haocn-ops/git-top");
assert.ok(registryServer.description.length > 0 && registryServer.description.length <= 100);
assert.equal(registryServer.title, "Git.Top");
assert.equal(registryServer.version, packageManifest.version);
assert.deepEqual(registryServer.repository, { url: "https://github.com/haocn-ops/git-top", source: "github" });
assert.equal(registryServer.websiteUrl, distribution.campaign_links.canonical_mcp_registry);
assert.deepEqual(registryServer.remotes, [{ type: "streamable-http", url: distribution.endpoints.mcp_core }]);
assert.equal(registryServer.packages, undefined);
assert.match(distributionRunbook, /mcp-publisher login github/);
assert.match(distributionRunbook, /prepared_not_submitted/);
assert.match(distributionRunbook, /status `active`/);
assert.match(distributionRunbook, /Smithery/);
assert.match(distributionRunbook, /Glama/);
assert.match(distributionRunbook, /partial_live/);
assert.match(distributionRunbook, /aggregate third-party catalog state is `live`/);
assert.match(distributionRunbook, /(does not|do not) mark a channel live/i);
assert.match(distributionRunbook, /plugins\/git-top/);
assert.match(distributionRunbook, /live_repo_marketplace/);

for (const [source, url] of Object.entries(distribution.campaign_links)) {
  const parsed = new URL(url);
  assert.equal(parsed.origin, "https://git.top");
  assert.equal(parsed.pathname, "/connect");
  assert.ok(parsed.searchParams.get("source"), `${source} campaign link should include source attribution`);
}

assert.match(skill, /^---\nname: git-top-project-selection\ndescription: .+\n---/);
assert.match(skill, /metadata\.source=d1/);
assert.match(skill, /require_d1=true/);
assert.match(skill, /result\.content\[0\]\.text/);
assert.doesNotMatch(skill, /\[TODO/);
assert.match(interfaceYaml, /\$git-top-project-selection/);

assert.equal(examples.length, 10);
assert.ok(examples.every((example) => example.verification.scope === "local_d1"));
assert.ok(examples.every((example) => example.expectedFields.includes("caveats") || example.exampleFinalAnswer.toLowerCase().includes("caveat")));
assert.ok(examples.every((example) => example.shortestRestPath.length > 0 && example.shortestMcpPath.length > 0));
const archivedReplacement = examples.find((example) => example.id === "replace-archived-python-agent-framework");
assert.ok(archivedReplacement?.externalEvidence?.some((evidence) => evidence.source === "github_api" && evidence.facts.includes("archived=true")));

console.log(`Validated distribution package, official Registry artifact, installable skill, and ${examples.length} decision-first examples.`);
