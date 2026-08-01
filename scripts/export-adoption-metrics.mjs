import { writeFile } from "node:fs/promises";
import { buildAdoptionExportQuery, parseAdoptionExportOptions } from "../src/adoption-export.ts";

const options = parseAdoptionExportOptions(process.argv.slice(2));
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const token = process.env.CLOUDFLARE_API_TOKEN;
if (!accountId || !token) {
  throw new Error("CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN are required; no analytics data was queried.");
}
const query = buildAdoptionExportQuery(options);

const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/analytics_engine/sql`, {
  method: "POST",
  headers: {
    authorization: `Bearer ${token}`,
    "content-type": "text/plain"
  },
  body: query
});

let payload;
try {
  payload = await response.json();
} catch {
  throw new Error(`Analytics Engine returned a non-JSON response (HTTP ${response.status}).`);
}

if (!response.ok || payload?.success === false) {
  const detail = Array.isArray(payload?.errors) ? payload.errors.map((error) => error?.message ?? String(error)).join("; ") : `HTTP ${response.status}`;
  throw new Error(`Analytics Engine export failed: ${detail}`);
}

const rows = Array.isArray(payload?.data) ? payload.data : [];
const output = `${JSON.stringify(rows, null, 2)}\n`;
if (options.output) {
  await writeFile(options.output, output, "utf8");
  console.error(`Exported ${rows.length} bounded Analytics Engine rows to ${options.output}.`);
} else {
  process.stdout.write(output);
}
