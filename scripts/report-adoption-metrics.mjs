import { writeFile } from "node:fs/promises";
import { normalizeAnalyticsPoint } from "../src/adoption-analytics.ts";
import { buildAdoptionExportQuery } from "../src/adoption-export.ts";
import { adoptionReportWindows, buildAdoptionOperationsReport, parseAdoptionReportOptions } from "../src/adoption-report.ts";

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

async function exportWindow(hours) {
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/analytics_engine/sql`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "text/plain"
    },
    body: buildAdoptionExportQuery({ hours, limit: options.limit })
  });

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error(`Analytics Engine returned a non-JSON response for the ${hours}-hour window (HTTP ${response.status}).`);
  }
  if (!response.ok || payload?.success === false) {
    const detail = Array.isArray(payload?.errors) ? payload.errors.map((error) => error?.message ?? String(error)).join("; ") : `HTTP ${response.status}`;
    throw new Error(`Analytics Engine ${hours}-hour export failed: ${detail}`);
  }
  return Array.isArray(payload?.data) ? payload.data : [];
}
