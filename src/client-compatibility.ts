import { json } from "./http";

type CheckStatus = "passed" | "not_run" | "failed";
type SupportLevel = "configuration_verified" | "supported" | "blocked";

interface ClientCompatibilityRow {
  client: string;
  version: string;
  transport: string;
  endpointProfile: "core" | "full";
  configurationCommand: string;
  configurationVerified: CheckStatus;
  initialize: CheckStatus;
  toolDiscovery: CheckStatus;
  firstCall: CheckStatus;
  multiToolWorkflow: CheckStatus;
  errorBehavior: CheckStatus;
  supportLevel: SupportLevel;
  lastVerified: string;
  knownLimitation: string;
}

const coreEndpoint = "https://git.top/mcp/core";

const clients: ClientCompatibilityRow[] = [
  {
    client: "Codex CLI, app, and IDE",
    version: "0.145.0",
    transport: "Streamable HTTP",
    endpointProfile: "core",
    configurationCommand: `codex mcp add git-top --url ${coreEndpoint}`,
    configurationVerified: "passed",
    initialize: "passed",
    toolDiscovery: "passed",
    firstCall: "passed",
    multiToolWorkflow: "passed",
    errorBehavior: "passed",
    supportLevel: "supported",
    lastVerified: "2026-07-31",
    knownLimitation: "Codex CLI JSONL does not expose the initialize handshake as a separate item; successful MCP startup and five-tool discovery were observed. Non-interactive codex exec requires the per-server default_tools_approval_mode=approve setting for these allow-listed read-only core tools."
  },
  {
    client: "Claude Code",
    version: "2.1.220",
    transport: "Streamable HTTP",
    endpointProfile: "core",
    configurationCommand: `claude mcp add --transport http --scope user git-top ${coreEndpoint}`,
    configurationVerified: "passed",
    initialize: "passed",
    toolDiscovery: "passed",
    firstCall: "passed",
    multiToolWorkflow: "passed",
    errorBehavior: "passed",
    supportLevel: "supported",
    lastVerified: "2026-07-31",
    knownLimitation: "Production D1 was healthy, so the exact -32003 outage path remains server-contract evidence; the real client handled -32005 not found and -32602 invalid input errors."
  }
];

export function buildClientCompatibilityReport() {
  return {
    name: "Git.Top Client Compatibility",
    schemaVersion: "git-top.client-compatibility.v1",
    lastReviewedAt: "2026-07-31",
    coreEndpoint,
    fullEndpoint: "https://git.top/mcp",
    supportPolicy: "A client is supported only after initialize, tool discovery, first call, multi-tool workflow, and error behavior all pass against production.",
    serverContract: {
      scope: "Generic MCP protocol contract validated locally and by production smoke; this is not a substitute for a real-client end-to-end run.",
      initialize: "passed" as CheckStatus,
      coreToolDiscovery: "passed" as CheckStatus,
      firstCoreCall: "passed" as CheckStatus,
      invalidInput: "passed" as CheckStatus,
      strictSourceRejection: "passed" as CheckStatus,
      productionSmoke: "passed" as CheckStatus,
      validationCommands: ["pnpm mcp:validate", "pnpm test:focused", "pnpm eval:agent-tasks"]
    },
    fullProfileEvidence: {
      client: "Claude Code",
      version: "2.1.220",
      endpoint: "https://git.top/mcp",
      verifiedAt: "2026-07-31",
      discoveredToolCount: 21,
      initialize: "passed" as CheckStatus,
      trustGate: "passed" as CheckStatus,
      grpQuery: "passed" as CheckStatus,
      projectLookup: "passed" as CheckStatus,
      notFoundRecovery: "passed" as CheckStatus,
      invalidInputRecovery: "passed" as CheckStatus,
      turns: 6,
      elapsedSeconds: 100.7,
      costUsd: 0.138,
      cacheCreationTokens: 27165,
      cacheReadTokens: 34572,
      baselineJsonRpcBytes: 101284,
      baselineEmbeddedJsonCharacters: 90057,
      limitation: "The compact rerun removed GRP result externalization and reduced tool latency, but its extra invalid-profile probe and independent model cache state make cross-run cost and cache-token comparisons non-causal.",
      compactProfileVerification: "passed",
      compactProfileEvidence: {
        workerVersion: "78773e20-b9f5-4e76-ad07-406264ee0f0b",
        profile: "compact",
        jsonRpcBytes: 31673,
        embeddedJsonCharacters: 28077,
        nodes: 24,
        edges: 40,
        solutionPaths: 3,
        truncated: true,
        source: "d1",
        trustDecision: "allow",
        resultExternalized: false,
        grpToolDurationMs: 854,
        turns: 6,
        elapsedSeconds: 53.615,
        costUsd: 0.29442495,
        cacheCreationTokens: 60957,
        cacheReadTokens: 99059,
        notFoundErrorCode: -32005,
        invalidProfileErrorCode: -32602
      }
    },
    clients,
    verificationPrompt: "Use Git.Top to recommend three open-source browser-agent projects for Docker, then cite the data source and one caveat for each.",
    nextRequiredEvidence: [
      "Run the verification prompt from the real client against the production core endpoint.",
      "Record initialize, tools/list, first useful call, a multi-tool decision, and invalid-input recovery.",
      "Promote support_level to supported only when every required client check passes."
    ]
  };
}

export function renderClientCompatibilityJson(): Response {
  return json(buildClientCompatibilityReport(), { headers: { "cache-control": "public, max-age=300" } });
}

export function renderClientCompatibilityPage(): Response {
  const report = buildClientCompatibilityReport();
  const supportedClientCount = report.clients.filter((client) => client.supportLevel === "supported").length;
  const rows = report.clients.map((client) => `
    <tr>
      <td><strong>${escapeHtml(client.client)}</strong><br><span class="muted">${escapeHtml(client.version)}</span></td>
      <td>${status(client.configurationVerified)}</td>
      <td>${status(client.initialize)}</td>
      <td>${status(client.toolDiscovery)}</td>
      <td>${status(client.firstCall)}</td>
      <td>${status(client.multiToolWorkflow)}</td>
      <td><code>${escapeHtml(client.supportLevel)}</code></td>
    </tr>`).join("");

  return new Response(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Client Compatibility | Git.Top</title><meta name="description" content="Dated Git.Top MCP client compatibility evidence, support policy, and known verification gaps.">
<link rel="canonical" href="https://git.top/compatibility"><style>
:root{color-scheme:light;--ink:#18242b;--muted:#5d6b72;--line:#d8e0e2;--surface:#fff;--wash:#f4f7f7;--accent:#0c6b5e}*{box-sizing:border-box}body{margin:0;background:var(--wash);color:var(--ink);font:16px/1.55 Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}main{width:min(1120px,calc(100% - 32px));margin:auto;padding:24px 0 64px}.nav{display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:32px}.nav a{color:var(--ink);font-weight:800;text-decoration:none}.links{display:flex;gap:16px;flex-wrap:wrap}.hero{padding:28px 0;border-bottom:1px solid var(--line)}h1{margin:0;font-size:clamp(36px,6vw,60px);line-height:1.04;letter-spacing:0}.lead{max-width:760px;color:var(--muted);font-size:19px}.section{padding:28px 0;border-bottom:1px solid var(--line)}h2{margin:0 0 10px;font-size:26px}.notice{padding:14px 16px;border-left:3px solid var(--accent);background:#eaf4f1}.table-wrap{overflow-x:auto;margin-top:18px;border:1px solid var(--line);background:var(--surface)}table{width:100%;min-width:920px;border-collapse:collapse}th,td{padding:13px;text-align:left;border-bottom:1px solid var(--line);vertical-align:top}th{font-size:12px;text-transform:uppercase;color:var(--muted)}.status{font-weight:800}.passed{color:#08705e}.not-run{color:#8a5a00}.muted{color:var(--muted)}code{font:600 13px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;overflow-wrap:anywhere}.actions{display:flex;gap:12px;flex-wrap:wrap}.button{display:inline-flex;min-height:42px;align-items:center;padding:9px 14px;border-radius:6px;background:var(--accent);color:#fff;text-decoration:none;font-weight:800}
</style></head><body><main><nav class="nav"><a href="/">Git.Top</a><div class="links"><a href="/connect">Connect</a><a href="/mcp">MCP</a><a href="/benchmark">Benchmark</a><a href="/docs">Docs</a></div></nav>
<header class="hero"><h1>Client compatibility, with evidence boundaries.</h1><p class="lead">This report separates shared server-contract tests from real-client end-to-end verification. Configuration syntax alone is not a support claim.</p></header>
<section class="section"><h2>Current policy</h2><p class="notice">${escapeHtml(report.supportPolicy)}</p><p class="muted">Last reviewed ${report.lastReviewedAt}. The generic server contract and production smoke passed. ${supportedClientCount} real ${supportedClientCount === 1 ? "client has" : "clients have"} dated production E2E evidence.</p></section>
<section class="section"><h2>Client matrix</h2><div class="table-wrap"><table><thead><tr><th>Client</th><th>Config</th><th>Initialize</th><th>Tools</th><th>First call</th><th>Workflow</th><th>Support level</th></tr></thead><tbody>${rows}</tbody></table></div><p class="muted">Support levels are based on the dated checks above. Review each row's known limitation before relying on a client-specific behavior claim.</p></section>
<section class="section"><h2>Next evidence</h2><p><code>${escapeHtml(report.verificationPrompt)}</code></p><div class="actions"><a class="button" href="/connect">Open connection guide</a><a class="button" href="/api/compatibility">Open compatibility JSON</a></div></section>
</main></body></html>`, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=300" } });
}

function status(value: CheckStatus): string {
  const label = value === "not_run" ? "not run" : value;
  return `<span class="status ${value.replace("_", "-")}">${label}</span>`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character);
}
