import { spawn } from "node:child_process";

const args = new Set(process.argv.slice(2));
const skipProdSmoke = args.has("--skip-prod-smoke") || process.env.GIT_TOP_SKIP_PROD_SMOKE === "1";

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
  steps.push({
    name: "production smoke",
    command: ["pnpm", "smoke:prod"]
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
