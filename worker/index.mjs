import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { sourceMedia } from "../shared/extraction/media.mjs";
import { extractSource } from "../shared/extraction/openai.mjs";
import { deliverDocument } from "./mail.mjs";

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
  await rpc("process_retention");
  const task = await rpc("claim_document_mail");
  if (task) {
    let provider = null,
      error = null;
    try {
      const file = await storage(
        `/object/authenticated/previews/${task.object_path}`,
      );
      if (!file.ok) throw Error("pdf_integrity");
      const bytes = Buffer.from(await file.arrayBuffer());
      // Recheck the claim and lifetime through Storage immediately before delivery.
      if (
        !(await rpc("authorize_document_mail", {
          p_id: task.id,
          p_claim: task.claim,
        }))
      )
        throw Error("configuration");
      provider = await deliverDocument(task, bytes);
    } catch (e) {
      error = ["pdf_integrity", "configuration"].includes(e.message)
        ? e.message
        : "transport";
      console.error(
        JSON.stringify({ event: "document_mail_retry", reason: error }),
      );
    }
    await rpc("finish_document_mail", {
      p_id: task.id,
      p_claim: task.claim,
      p_provider: provider,
      p_error: error,
    });
  }
  for (const old of await rpc("validation_cleanup_tasks")) {
    const deleted = await storage(`/object/${old.bucket}`, {
      method: "DELETE",
      body: JSON.stringify({ prefixes: [old.object_path] }),
    });
    if (deleted.ok || deleted.status === 404)
      await rpc("finish_validation_cleanup", { p_id: old.id });
  }
  for (const old of await rpc("obsolete_brie_previews")) {
    const deleted = await storage("/object/previews", {
      method: "DELETE",
      body: JSON.stringify({ prefixes: [old.object_path] }),
    });
    if (deleted.ok || deleted.status === 404)
      await rpc("remove_obsolete_preview", { p_job: old.id });
  }
  const extraction = await rpc("claim_extraction");
  if (extraction) {
    let result = null,
      error = null;
    try {
      let bytes;
      if (extraction.object_path) {
        const file = await storage(
          `/object/authenticated/sources/${extraction.object_path}`,
        );
        if (!file.ok) throw Error("integrity");
        bytes = Buffer.from(await file.arrayBuffer());
        const media = sourceMedia(bytes, extraction.mime);
        if (media.seconds !== extraction.seconds) throw Error("integrity");
      } else bytes = Buffer.from(extraction.source_text);
      if (
        createHash("sha256").update(bytes).digest("hex") !== extraction.sha256
      )
        throw Error("integrity");
      if (
        !(await rpc("authorize_extraction", {
          p_job: extraction.id,
          p_claim: extraction.claim,
        }))
      )
        return;
      result = await extractSource(extraction.document_type, extraction, bytes);
    } catch (e) {
      error = [
        "ai_configuration",
        "ai_permission",
        "ai_quota",
        "ai_transport",
        "ai_input",
        "ai_output",
      ].includes(e.message)
        ? e.message
        : "integrity";
      console.error(
        JSON.stringify({ event: "extraction_failed", reason: error }),
      );
    }
    await rpc("finish_extraction", {
      p_job: extraction.id,
      p_claim: extraction.claim,
      p_result: result
        ? { fields: result.fields, issues: result.issues }
        : null,
      p_transcription: result?.transcription || null,
      p_usage: result
        ? {
            ...result.usage,
            requestId: result.requestId,
            audioRequest: result.audioRequest,
          }
        : null,
      p_error: error,
    });
    return;
  }
  const jobs = await rpc("claim_brie_job");
  const job = jobs[0];
  if (!job) return;
  try {
    const cie = job.document_type === "CIE";
    const render = cie
      ? (await import("../shared/pdf/cie.mjs")).renderCie
      : (await import("../shared/pdf/brie.mjs")).renderBrie;
    const [template, font] = await Promise.all([
      readFile(
        new URL(
          cie ? "../assets/pdf/cie.pdf" : "../assets/pdf/brie.pdf",
          import.meta.url,
        ),
      ),
      readFile(
        new URL("../assets/pdf/LiberationSans-Regular.ttf", import.meta.url),
      ),
    ]);
    let bytes;
    try {
      bytes = (await render(job.payload, template, font)).bytes;
    } catch (e) {
      const match = /^([A-Za-z0-9_]+):/.exec(e.message || "");
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
