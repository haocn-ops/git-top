import { spawn } from "node:child_process";

const options = parseArgs(process.argv.slice(2));
const skipProdSmoke = options.skipProdSmoke === true || process.env.GIT_TOP_SKIP_PROD_SMOKE === "1";
const skipQuality = options.skipQuality === true || process.env.GIT_TOP_SKIP_QUALITY === "1";
const baseUrl = options.baseUrl ?? process.env.GIT_TOP_RELEASE_BASE_URL;
const allowSeed = options.allowSeed === true || process.env.GIT_TOP_RELEASE_ALLOW_SEED === "1";

const steps = [
  {
    name: "local validation",
    command: ["pnpm", "validate"]
  },
  {
    name: "local D1 integration",
    command: ["pnpm", "db:integration"]
  }
];

if (!skipProdSmoke) {
  if (!skipQuality) {
    const qualityCommand = ["pnpm", "quality:check"];
    if (baseUrl) {
      qualityCommand.push("--", "--base-url", baseUrl);
    }
    if (options.minScore) {
      if (!baseUrl) {
        qualityCommand.push("--");
      }
      qualityCommand.push("--min-score", options.minScore);
    }
    if (allowSeed) {
      if (!baseUrl && !options.minScore) {
        qualityCommand.push("--");
      }
      qualityCommand.push("--allow-seed");
    }
    steps.push({
      name: "production quality",
      command: qualityCommand
    });
  }

  const smokeCommand = ["pnpm", "smoke:prod"];
  if (baseUrl) {
    smokeCommand.push("--", "--base-url", baseUrl);
  }
  if (allowSeed) {
    if (!baseUrl) {
      smokeCommand.push("--");
    }
    smokeCommand.push("--allow-seed");
  }
  steps.push({
    name: "production smoke",
    command: smokeCommand
  });
}

for (const step of steps) {
  console.log(`\n==> ${step.name}: ${step.command.join(" ")}`);
  await run(step.command);
}

console.log("\nPublic V1 verification passed.");

function run(command) {
  return new Promise((resolve, reject) => {
    const child = spawn(command[0], command.slice(1), {
      stdio: "inherit",
      shell: false
    });

    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command.join(" ")} failed with ${signal ?? `exit code ${code}`}`));
    });
  });
}

function parseArgs(args) {
  const parsed = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--") {
      continue;
    } else if (arg === "--skip-prod-smoke") {
      parsed.skipProdSmoke = true;
    } else if (arg === "--skip-quality") {
      parsed.skipQuality = true;
    } else if (arg === "--base-url") {
      parsed.baseUrl = args[index + 1];
      index += 1;
    } else if (arg.startsWith("--base-url=")) {
      parsed.baseUrl = arg.slice("--base-url=".length);
    } else if (arg === "--min-score") {
      parsed.minScore = args[index + 1];
      index += 1;
    } else if (arg.startsWith("--min-score=")) {
      parsed.minScore = arg.slice("--min-score=".length);
    } else if (arg === "--allow-seed") {
      parsed.allowSeed = true;
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }
  return parsed;
}
