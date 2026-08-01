import distributionPackage from "../distribution/git-top-agent-distribution.json";
import { rawJson } from "./http";

export function buildAgentDistributionPackage() {
  return distributionPackage;
}

export function renderAgentDistributionPackage(): Response {
  return rawJson(distributionPackage, { headers: { "cache-control": "public, max-age=300" } });
}
