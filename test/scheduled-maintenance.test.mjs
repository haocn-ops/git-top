import assert from "node:assert/strict";
import test from "node:test";

import { runMaintenanceSteps } from "../src/index.ts";

test("scheduled maintenance continues after an isolated step fails", async () => {
  const executed = [];

  await runMaintenanceSteps(
    {},
    [
      {
        task: "first",
        run: async () => {
          executed.push("first");
          throw new Error("expected failure");
        }
      },
      {
        task: "second",
        run: async () => {
          executed.push("second");
        }
      },
      {
        task: "third",
        run: async () => {
          executed.push("third");
        }
      }
    ]
  );

  assert.deepEqual(executed, ["first", "second", "third"]);
});
