import { listProjectKnowledgeWithMeta } from "./knowledge-source";
import { getProjectKnowledgeFromList } from "./project-search";
import { calculateAgentScore } from "./project-view";
import type { Env } from "./types";

export function renderOgImage(title = "Git.Top", subtitle = "GitHub Knowledge Layer for AI Agents"): Response {
  return svgResponse(String.raw`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-label="${escapeAttr(title)}">
  <rect width="1200" height="630" fill="#f6f8fb"/>
  <rect x="52" y="52" width="1096" height="526" rx="22" fill="#ffffff" stroke="#dce3e8"/>
  <rect x="86" y="86" width="84" height="84" rx="18" fill="#e6f3ef"/>
  <text x="128" y="141" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="46" font-weight="900" fill="#0f766e">G</text>
  <text x="198" y="122" font-family="Inter, Arial, sans-serif" font-size="28" font-weight="900" fill="#0b5d56">Git.Top</text>
  <text x="198" y="158" font-family="Inter, Arial, sans-serif" font-size="24" font-weight="700" fill="#66737c">Agent-native GitHub project intelligence</text>
  <text x="86" y="282" font-family="Inter, Arial, sans-serif" font-size="74" font-weight="900" fill="#182026">${escapeXml(title)}</text>
  <foreignObject x="88" y="322" width="960" height="120">
    <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: Inter, Arial, sans-serif; font-size: 32px; line-height: 1.35; color: #40505a;">${escapeHtml(subtitle)}</div>
  </foreignObject>
  <g transform="translate(86 480)">
    <rect width="250" height="52" rx="10" fill="#0f766e"/>
    <text x="125" y="34" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="20" font-weight="900" fill="#ffffff">Search Projects</text>
    <rect x="268" width="230" height="52" rx="10" fill="#f7faf9" stroke="#dce3e8"/>
    <text x="383" y="34" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="20" font-weight="900" fill="#2e4c58">MCP Ready</text>
    <rect x="516" width="260" height="52" rx="10" fill="#f7faf9" stroke="#dce3e8"/>
    <text x="646" y="34" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="20" font-weight="900" fill="#2e4c58">Quality Signals</text>
  </g>
</svg>`);
}

export async function renderBadge(env: Env, projectId: string): Promise<Response> {
  const knowledge = await listProjectKnowledgeWithMeta(env);
  const project = getProjectKnowledgeFromList(knowledge.projects, projectId);
  const label = project?.project.fullName ?? projectId;
  const score = project ? calculateAgentScore(project) : null;
  const value = score === null ? "unknown" : `${score}`;
  const rightWidth = score === null ? 92 : 52;
  const totalWidth = 118 + rightWidth;
  return svgResponse(String.raw`<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="28" viewBox="0 0 ${totalWidth} 28" role="img" aria-label="Git.Top Agent Score for ${escapeAttr(label)}">
  <rect width="${totalWidth}" height="28" rx="6" fill="#182026"/>
  <rect x="118" width="${rightWidth}" height="28" rx="6" fill="#0f766e"/>
  <path d="M118 0h8v28h-8z" fill="#0f766e"/>
  <text x="59" y="18" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="12" font-weight="800" fill="#ffffff">Git.Top Agent</text>
  <text x="${118 + rightWidth / 2}" y="18" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="12" font-weight="900" fill="#ffffff">${escapeXml(value)}</text>
</svg>`);
}

function svgResponse(body: string): Response {
  return new Response(body, {
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      "cache-control": "public, max-age=300"
    }
  });
}

function escapeAttr(value: string): string {
  return escapeXml(value);
}

function escapeHtml(value: string): string {
  return escapeXml(value);
}

function escapeXml(value: string): string {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
