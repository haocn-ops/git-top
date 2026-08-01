import { readFile } from "node:fs/promises";
import { normalizeAnalyticsPoint, summarizeAdoptionEvents } from "../src/adoption-analytics.ts";

const inputPath = process.argv[2];
if (!inputPath) {
  console.error("Usage: node scripts/summarize-adoption-metrics.mjs <analytics-events.json>");
  process.exit(1);
}

const parsed = JSON.parse(await readFile(inputPath, "utf8"));
if (!Array.isArray(parsed)) {
  throw new Error("Analytics export must be a JSON array of bounded adoption events.");
}

const events = parsed.map((point) => {
  if (point && typeof point === "object" && "name" in point) {
    return point;
  }
  return normalizeAnalyticsPoint(point);
});

console.log(JSON.stringify(summarizeAdoptionEvents(events), null, 2));
