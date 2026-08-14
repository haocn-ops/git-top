import { writeFile } from "node:fs/promises";
import { normalizeAnalyticsPoint } from "../src/adoption-analytics.ts";
import { buildAdoptionExportQuery } from "../src/adoption-export.ts";
import {
  adoptionReportWindows,
  buildAdoptionOperationsReport,
  parseAdoptionReportOptions,
  renderAdoptionOperationsMarkdown
} from "../src/adoption-report.ts";

const options = parseAdoptionReportOptions(process.argv.slice(2));
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const token = process.env.CLOUDFLARE_API_TOKEN;
if (!accountId || !token) {
  throw new Error("CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN are required; no analytics data was queried.");
}

const [weeklyRows, monthlyRows] = await Promise.all([
  exportWindow(adoptionReportWindows.weeklyHours),
  exportWindow(adoptionReportWindows.monthlyHours)
]);
const report = buildAdoptionOperationsReport({
  weeklyEvents: weeklyRows.map(normalizeAnalyticsPoint),
  monthlyEvents: monthlyRows.map(normalizeAnalyticsPoint),
  limit: options.limit,
  excludedCampaignSources: options.excludedCampaignSources
});
const output = `${JSON.stringify(report, null, 2)}\n`;

if (options.output) {
  await writeFile(options.output, output, "utf8");
  console.error(`Wrote bounded 7/30-day adoption report to ${options.output}.`);
} else {
  process.stdout.write(output);
}
if (options.summaryOutput) {
  await writeFile(options.summaryOutput, renderAdoptionOperationsMarkdown(report), "utf8");
  console.error(`Wrote adoption operations summary to ${options.summaryOutput}.`);
}
if (options.failOnTruncated && (report.windows.last_7_days.possibly_truncated || report.windows.last_30_days.possibly_truncated)) {
  throw new Error("Adoption report reached the bounded export limit; refusing to treat truncated analytics as complete.");
}

async function exportWindow(hours) {
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/analytics_engine/sql`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "text/plain"
    },
    body: buildAdoptionExportQuery({ hours, limit: options.limit })
  });

  const responseText = await response.text();
  let payload;
  try {
    payload = JSON.parse(responseText);
  } catch {
    throw new Error(`Analytics Engine returned a non-JSON response for the ${hours}-hour window (HTTP ${response.status}): ${boundedResponseDetail(responseText)}`);
  }
  if (!response.ok || payload?.success === false) {
    const detail = Array.isArray(payload?.errors) ? payload.errors.map((error) => error?.message ?? String(error)).join("; ") : `HTTP ${response.status}`;
    throw new Error(`Analytics Engine ${hours}-hour export failed: ${detail}`);
  }
  return Array.isArray(payload?.data) ? payload.data : [];
}

function boundedResponseDetail(value) {
  return value.replace(/\s+/g, " ").trim().slice(0, 500) || "empty response";
}
