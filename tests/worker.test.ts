import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import test from "node:test";

test("worker arranca sin credenciales, expone solo liveness y se detiene", {
  timeout: 15000,
}, async () => {
  const child = spawn(process.execPath, ["worker/index.mjs"], {
    env: { ...process.env, HOSTNAME: "127.0.0.1" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  try {
    await once(child.stdout, "data");
    const response = await fetch("http://127.0.0.1:3001/health");
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      status: "ok",
      service: "boletinexpress-worker",
      jobsEnabled: false,
    });
    assert.equal(
      (await fetch("http://127.0.0.1:3001/jobs", { method: "POST" })).status,
      404,
    );
    const exited = once(child, "exit");
    child.kill("SIGTERM");
    const [code] = await exited;
    assert.equal(code, 0);
  } finally {
    if (child.exitCode === null) child.kill("SIGKILL");
  }
});
