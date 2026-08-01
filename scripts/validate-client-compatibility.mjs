import assert from "node:assert/strict";
import { buildClientCompatibilityReport } from "../src/client-compatibility.ts";

const report = buildClientCompatibilityReport();
const requiredClientChecks = ["initialize", "toolDiscovery", "firstCall", "multiToolWorkflow", "errorBehavior"];
const allowedCheckStatuses = new Set(["passed", "not_run", "failed"]);
const allowedSupportLevels = new Set(["configuration_verified", "supported", "blocked"]);

assert.equal(report.schemaVersion, "git-top.client-compatibility.v1");
assert.match(report.lastReviewedAt, /^\d{4}-\d{2}-\d{2}$/);
assert.ok(report.clients.length >= 2, "compatibility report should include the initial two clients");
assert.equal(report.serverContract.productionSmoke, "passed");
assert.equal(report.fullProfileEvidence.discoveredToolCount, 21);
assert.equal(report.fullProfileEvidence.grpQuery, "passed");
assert.equal(report.fullProfileEvidence.invalidInputRecovery, "passed");
assert.equal(report.fullProfileEvidence.compactProfileVerification, "passed");
assert.ok(report.fullProfileEvidence.baselineJsonRpcBytes > 100_000);
assert.ok(report.fullProfileEvidence.compactProfileEvidence.jsonRpcBytes < report.fullProfileEvidence.baselineJsonRpcBytes);
assert.equal(report.fullProfileEvidence.compactProfileEvidence.resultExternalized, false);
assert.equal(report.fullProfileEvidence.compactProfileEvidence.source, "d1");

for (const client of report.clients) {
  assert.ok(client.client);
  assert.ok(client.version);
  assert.equal(client.transport, "Streamable HTTP");
  assert.ok(client.configurationCommand.includes(report.coreEndpoint));
  assert.ok(allowedCheckStatuses.has(client.configurationVerified));
  assert.ok(allowedSupportLevels.has(client.supportLevel));
  assert.match(client.lastVerified, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(client.knownLimitation.length > 0);

  for (const check of requiredClientChecks) {
    assert.ok(allowedCheckStatuses.has(client[check]), `${client.client} has an invalid ${check} status`);
  }

  const requiredChecksPassed = requiredClientChecks.every((check) => client[check] === "passed");
  assert.equal(client.supportLevel === "supported", requiredChecksPassed, `${client.client} support claim must match all required checks`);
  if (client.supportLevel === "configuration_verified") {
    assert.equal(client.configurationVerified, "passed");
    assert.equal(requiredChecksPassed, false);
  }
}

console.log(`Validated ${report.clients.length} client compatibility rows without unsupported support claims.`);
