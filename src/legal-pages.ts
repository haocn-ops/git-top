const baseStyles = `
  :root { color-scheme: light; --ink:#17313a; --muted:#5c7075; --line:#d8e4e5; --surface:#ffffff; --accent:#17796d; --wash:#f4f8f7; }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--wash); color:var(--ink); font:16px/1.7 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
  main { width:min(860px, calc(100% - 32px)); margin:0 auto; padding:28px 0 72px; }
  nav { display:flex; justify-content:space-between; gap:16px; align-items:center; margin-bottom:56px; }
  nav a { color:var(--accent); text-decoration:none; }
  .brand { color:var(--ink); font-weight:800; letter-spacing:.02em; }
  .nav-links { display:flex; flex-wrap:wrap; gap:16px; font-size:14px; }
  article { background:var(--surface); border:1px solid var(--line); border-radius:8px; padding:28px; box-shadow:0 10px 28px rgba(23,49,58,.06); }
  h1 { margin:0 0 8px; font-size:clamp(32px, 6vw, 48px); line-height:1.1; letter-spacing:0; }
  h2 { margin:28px 0 8px; font-size:22px; line-height:1.25; }
  p, li { color:var(--muted); }
  code { background:#edf3f2; padding:2px 5px; border-radius:4px; }
  a { color:var(--accent); }
  .meta { margin:0 0 26px; color:var(--muted); font-size:14px; }
  @media (max-width:640px) { article { padding:20px; } nav { align-items:flex-start; flex-direction:column; margin-bottom:36px; } }
`;

export function renderPrivacyPolicyPage(): Response {
  return renderLegalPage(
    "Privacy Policy",
    "How Git.Top handles public product usage and optional adoption analytics.",
    [
      ["What Git.Top provides", "Git.Top is a public, read-only knowledge service for discovering and comparing open-source projects. Public REST, MCP, OpenAPI, discovery, and documentation requests do not require an account, cookies, API keys, or OAuth."],
      ["Data used to answer requests", "Git.Top uses its curated and D1-backed project knowledge, public GitHub-derived metadata, and request parameters needed to return the requested result. The service does not sell personal information."],
      ["Optional adoption analytics", "Git.Top may write bounded aggregate events to Cloudflare Analytics Engine to measure connection and workflow health. Events may include a UTC time bucket, endpoint profile, normalized client name and version when supplied by the protocol, operation name, coarse result class, source class, latency bucket, response-size bucket, and explicit campaign source."],
      ["What analytics exclude", "Analytics do not record prompts, natural-language goals, MCP arguments, tool results, selected repository identifiers, raw IP addresses, authorization headers, cookies, or full user-agent strings. Analytics failures do not block product responses."],
      ["Retention and requests", "Operational retention and export limits are documented in the repository runbook. For privacy or data questions, contact security@git.top. For a product issue, use the public issue tracker."],
      ["Changes", "This policy may be updated when the service or measurement boundary changes. The effective date below identifies the version currently published at this URL."]
    ],
    "Effective 2026-08-01"
  );
}

export function renderTermsPage(): Response {
  return renderLegalPage(
    "Terms of Use",
    "Rules for using Git.Top's public knowledge, REST, and MCP surfaces.",
    [
      ["Permitted use", "You may use Git.Top for research, project selection, dependency evaluation, agent workflows, and other lawful software-development purposes. You may cite or transform returned project information with appropriate source and caveat disclosure."],
      ["Service boundary", "Git.Top is decision support, not a guarantee that a project is secure, maintained, compatible, licensed for your use, or suitable for production. Verify important claims against the upstream repository, license, releases, and deployment documentation."],
      ["Responsible automation", "Keep request rates reasonable, respect public endpoint limits, and do not attempt to bypass access controls, interfere with the Worker or its data sources, or use the service to violate third-party rights. Read-only MCP and REST calls are available without credentials."],
      ["Third-party content", "Project names, descriptions, licenses, and repository metadata may originate from public third-party sources. Those sources retain their respective rights and terms."],
      ["Availability and changes", "The service is provided on an as-available basis. Git.Top may change endpoints, data, limits, or supported client versions as the product evolves, while documenting material agent-facing contract changes."],
      ["Contact", "For security reports, use security@git.top. For general support and requests, use the GitHub issue tracker linked from the support page and distribution package."]
    ],
    "Effective 2026-08-01"
  );
}

function renderLegalPage(title: string, intro: string, sections: Array<[string, string]>, meta: string): Response {
  const content = sections.map(([heading, body]) => `<section><h2>${escapeHtml(heading)}</h2><p>${escapeHtml(body)}</p></section>`).join("\n");
  return new Response(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)} | Git.Top</title><meta name="description" content="${escapeHtml(intro)}"><style>${baseStyles}</style></head>
  <body><main><nav><a class="brand" href="/">Git.Top</a><div class="nav-links"><a href="/connect">Connect</a><a href="/integrations">Integrations</a><a href="/integrations">Support</a></div></nav><article><h1>${escapeHtml(title)}</h1><p class="meta">${escapeHtml(intro)}<br>${escapeHtml(meta)}</p>${content}</article></main></body></html>`, {
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=3600" }
  });
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character);
}
