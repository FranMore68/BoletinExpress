import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";

const enabled = Boolean(
  process.env.WORKER_KEY &&
    process.env.WORKER_REST_URL &&
    process.env.WORKER_STORAGE_URL,
);
let stopping = false;
const auth = {
  Authorization: `Bearer ${process.env.WORKER_KEY}`,
  "Content-Type": "application/json",
};
async function rpc(name, body = {}) {
  const r = await fetch(`${process.env.WORKER_REST_URL}/rpc/${name}`, {
    method: "POST",
    headers: auth,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  if (!r.ok) throw new Error("worker_rpc_failed");
  return r.json();
}
async function storage(path, options = {}) {
  return fetch(`${process.env.WORKER_STORAGE_URL}${path}`, {
    ...options,
    headers: { ...auth, ...options.headers },
    signal: AbortSignal.timeout(15000),
  });
}
async function tick() {
  for (const old of await rpc("obsolete_brie_previews")) {
    const deleted = await storage("/object/previews", {
      method: "DELETE",
      body: JSON.stringify({ prefixes: [old.object_path] }),
    });
    if (deleted.ok || deleted.status === 404)
      await rpc("remove_obsolete_preview", { p_job: old.id });
  }
  const jobs = await rpc("claim_brie_job");
  const job = jobs[0];
  if (!job) return;
  try {
    const { renderBrie } = await import("../shared/pdf/brie.mjs");
    const [template, font] = await Promise.all([
      readFile(new URL("../assets/pdf/brie.pdf", import.meta.url)),
      readFile(
        new URL("../assets/pdf/LiberationSans-Regular.ttf", import.meta.url),
      ),
    ]);
    let bytes;
    try {
      bytes = (await renderBrie(job.payload, template, font)).bytes;
    } catch (e) {
      const match = /^([a-z0-9_]+):/.exec(e.message || "");
      await rpc("finish_brie_job", {
        p_job: job.id,
        p_claim: job.claim,
        p_sha: null,
        p_errors: match ? [match[1]] : [],
      });
      return;
    }
    const uploaded = await storage(`/object/previews/${job.object_path}`, {
      method: "POST",
      headers: { "Content-Type": "application/pdf", "x-upsert": "false" },
      body: bytes,
    });
    if (!uploaded.ok) {
      if (uploaded.status !== 409 && uploaded.status !== 400)
        throw new Error("worker_upload_failed");
      // A previous attempt may have uploaded the immutable file before crashing.
      const existing = await storage(
        `/object/authenticated/previews/${job.object_path}`,
      );
      if (!existing.ok) throw new Error("worker_upload_failed");
      bytes = new Uint8Array(await existing.arrayBuffer());
      if (Buffer.from(bytes).subarray(0, 5).toString() !== "%PDF-")
        throw new Error("worker_upload_failed");
    }
    await rpc("finish_brie_job", {
      p_job: job.id,
      p_claim: job.claim,
      p_sha: createHash("sha256").update(bytes).digest("hex"),
      p_errors: null,
    });
  } catch {
    await rpc("finish_brie_job", {
      p_job: job.id,
      p_claim: job.claim,
      p_sha: null,
      p_errors: [],
    }).catch(() => {});
    console.error(JSON.stringify({ event: "pdf_job_retry" }));
  }
}
const server = createServer((request, response) => {
  if (request.method !== "GET" || request.url !== "/health") {
    response.writeHead(404).end();
    return;
  }
  response.writeHead(200, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  });
  response.end(
    JSON.stringify({
      status: "ok",
      service: "boletinexpress-worker",
      jobsEnabled: enabled,
    }),
  );
});
server.listen(3001, process.env.HOSTNAME || "127.0.0.1", () =>
  console.log(
    JSON.stringify({ event: "worker_started", jobsEnabled: enabled }),
  ),
);
async function loop() {
  while (!stopping) {
    await tick().catch(() =>
      console.error(JSON.stringify({ event: "worker_unavailable" })),
    );
    if (!stopping) await new Promise((r) => setTimeout(r, 2000));
  }
}
if (enabled) void loop();
for (const signal of ["SIGTERM", "SIGINT"]) {
  process.once(signal, () => {
    stopping = true;
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 5000).unref();
  });
}
