import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeFile } from "node:fs/promises";

const taskDefinitions = {
  "daily-production-health": {
    commands: [["pnpm", "quality:check"], ["pnpm", "smoke:prod"], ["node", "-e", "fetch('https://git.top/api/sync/status').then(r=>{if(!r.ok)process.exit(1);return r.json()}).then(j=>{console.log(JSON.stringify({health:j.health,freshness:j.freshness,indexed_count:j.indexed_count,synced_count:j.synced_count,last_successful_sync_at:j.last_successful_sync_at},null,2)); if(j.health!=='healthy'||j.freshness!=='fresh') process.exit(1);})"]]
  },
  "production-data-maintenance": {
    commands: [
      ["pnpm", "sync:prod:stale"],
      ["pnpm", "alternatives:prod:refresh"],
      ["node", "-e", "await new Promise(resolve => setTimeout(resolve, 15000))"],
      ["pnpm", "quality:check"],
      ["pnpm", "smoke:prod"]
    ]
  },
  "production-alternatives-segment": {
    commands: [["pnpm", "alternatives:prod:refresh"]]
  },
  "weekly-data-governance": {
    commands: [
      ["pnpm", "seed:validate"],
      ["pnpm", "seed:coverage"],
      ["pnpm", "eval:fixtures"],
      ["pnpm", "quality:review"],
      ["pnpm", "eval:quality"],
      ["pnpm", "eval:explanations"],
      ["pnpm", "test:focused"],
      ["pnpm", "docs:validate"]
    ]
  },
  "biweekly-live-check": {
    commands: [["pnpm", "seed:live-check", "--", "--limit", "50"]]
  },
  "monthly-corpus-review": {
    commands: [["pnpm", "seed:candidates"], ["pnpm", "eval:local"], ["pnpm", "eval:ranking"], ["pnpm", "quality:review"]]
  }
};

const task = process.argv[2];
if (!task || !taskDefinitions[task]) {
  console.error(`Unknown governance task: ${task ?? ""}`);
  console.error(`Known tasks: ${Object.keys(taskDefinitions).join(", ")}`);
  process.exit(1);
}

const definition = taskDefinitions[task];
const startedAt = new Date().toISOString();
const startedMs = Date.now();
const results = [];
let failed = false;
const runKey = `${task}-${startedMs}`;
const summaryPath = join(tmpdir(), `${runKey}-governance-summary.json`);
const errorPath = join(tmpdir(), `${runKey}-governance-error.txt`);

for (const command of definition.commands) {
  const result = await runCommand(command);
  results.push(result);
  if (result.exitCode !== 0) {
    failed = true;
    if (definition.stopOnFailure !== false) {
      break;
    }
  }
}

const finishedAt = new Date().toISOString();
const summary = {
  task,
  commands: results.map((result) => ({
    command: result.command.join(" "),
    exit_code: result.exitCode,
    duration_ms: result.durationMs
  })),
  passed: results.filter((result) => result.exitCode === 0).length,
  failed: results.filter((result) => result.exitCode !== 0).length
};
await writeFile(summaryPath, JSON.stringify(summary, null, 2));
const error = results
  .filter((result) => result.exitCode !== 0)
  .map((result) => `${result.command.join(" ")} exited ${result.exitCode}\n${result.stderr || result.stdout}`)
  .join("\n\n")
  .slice(0, 4000);
await writeFile(errorPath, error);

const recordArgs = [
  "scripts/record-governance-run.mjs",
  "--task",
  task,
  "--status",
  failed ? "failed" : "success",
  "--started-at",
  startedAt,
  "--finished-at",
  finishedAt,
  "--duration-ms",
  String(Date.now() - startedMs),
  "--summary-file",
  summaryPath,
  "--error-file",
  errorPath
];
await runCommand(["node", ...recordArgs], { ignoreFailure: true });

if (failed) {
  process.exit(1);
}

async function runCommand(command, options = {}) {
  const started = Date.now();
  console.log(`$ ${command.join(" ")}`);
  const child = spawn(command[0], command.slice(1), {
    stdio: ["ignore", "pipe", "pipe"],
    env: process.env
  });

  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => {
    const text = chunk.toString();
    stdout += text;
    process.stdout.write(text);
  });
  child.stderr.on("data", (chunk) => {
    const text = chunk.toString();
    stderr += text;
    process.stderr.write(text);
  });

  const exitCode = await new Promise((resolve) => {
    child.on("close", resolve);
  });
  const result = {
    command,
    exitCode,
    durationMs: Date.now() - started,
    stdout: stdout.slice(-4000),
    stderr: stderr.slice(-4000)
  };
  if (exitCode !== 0 && !options.ignoreFailure) {
    console.error(`Command failed with exit code ${exitCode}: ${command.join(" ")}`);
  }
  return result;
}
