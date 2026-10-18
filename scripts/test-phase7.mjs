import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { pcmWav } from "../src/modules/extraction/audio.ts";
import { BrowserSession, emailToken, env, json } from "./auth-test-client.mjs";

const dir = process.env.PHASE7_REPORT_DIR || "evidence/phase-7";
await mkdir(dir, { recursive: true });
const results = [],
  accounts = [];
async function pass(test) {
  results.push({ test, pass: true });
  console.log("PASS", test);
  await writeFile(
    `${dir}/integration.json`,
    `${JSON.stringify({ pass: false, complete: false, results }, null, 2)}\n`,
  );
}
const run = (args, input = "") =>
  new Promise((resolve, reject) => {
    const p = spawn("docker", args, { stdio: ["pipe", "pipe", "pipe"] });
    let out = "";
    p.stdout.on("data", (x) => (out += x));
    p.stderr.resume();
    p.on("error", reject);
    p.on("exit", (c) =>
      c === 0
        ? resolve(out.trim())
        : reject(Error("fixture Docker/SQL fallida")),
    );
    p.stdin.end(input);
  });
const sql = (q) =>
  run(
    [
      "compose",
      "--env-file",
      ".secrets/supabase.env",
      "-f",
      "infra/supabase/compose.yaml",
      "exec",
      "-T",
      "postgres",
      "psql",
      "-U",
      "supabase_admin",
      "-d",
      "postgres",
      "-qAt",
      "-v",
      "ON_ERROR_STOP=1",
    ],
    q,
  );
const worker = (cmd) =>
  run([
    "compose",
    "-f",
    "compose.yaml",
    "-f",
    "compose.auth.yaml",
    cmd,
    "worker",
  ]);
const workerEnv = Object.fromEntries(
  (await readFile(".secrets/worker.env", "utf8"))
    .trim()
    .split("\n")
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1)];
    }),
);
async function rpc(name, body = {}) {
  const r = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      apikey: env.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${workerEnv.WORKER_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  assert.equal(r.status, 200, `worker RPC ${name}`);
  return r.json();
}
const post = (a, path, body, status = 200) =>
  a.jar.request(path, { method: "POST", body }).then((r) => json(r, status));
const get = (a, path, status = 200) =>
  a.jar.request(path).then((r) => json(r, status));
async function account() {
  const a = {
    jar: new BrowserSession(),
    email: `phase7-${randomUUID()}@example.invalid`,
  };
  await post(a, "/api/auth/signup", { email: a.email, password: randomUUID() });
  await post(a, "/api/auth/confirm", {
    token_hash: await emailToken(a.email, "email"),
    type: "email",
  });
  a.user = await get(a, "/api/auth/session");
  accounts.push(a);
  const encoded = [...a.jar.cookies]
    .filter(([k]) => /-auth-token(?:\.\d+)?$/.test(k))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => decodeURIComponent(v))
    .join("");
  const session = JSON.parse(
    Buffer.from(encoded.replace(/^base64-/, ""), "base64url").toString(),
  );
  a.client = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${session.access_token}` } },
  });
  return a;
}
const create = async (a, type = "BRIE") =>
  (
    await post(
      a,
      "/api/private/documents",
      { type, title: "EXTRACCION FICTICIA" },
      201,
    )
  ).document;
const base = (doc) => `/api/private/documents/${doc.id}/extractions`;
const text = (
  a,
  doc,
  requestId = randomUUID(),
  value = "Nota ficticia: tensión 400 V",
) => post(a, base(doc), { text: value, requestId }, 202);
const photo = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lQAAAABJRU5ErkJggg==",
  "base64",
);
const audio = (seconds) =>
  Buffer.from(pcmWav(new Float32Array(16000 * seconds)));
const upload = async (a, doc, bytes, mime, id = randomUUID(), status = 202) =>
  json(
    await a.jar.request(base(doc), {
      method: "POST",
      headers: { "Content-Type": mime, "X-Request-ID": id },
      body: bytes,
    }),
    status,
  );
const finish = async (job, fields = [], error = null, issues = []) =>
  rpc("finish_extraction", {
    p_job: job.id,
    p_claim: job.claim,
    p_result: error ? null : { fields, issues },
    p_transcription: null,
    p_usage: { fixture: true },
    p_error: error,
  });
const proposal = (key, value, uncertain = false) => ({
  key,
  value,
  evidence: "Fuente ficticia",
  uncertain,
});
const count = (a) =>
  sql(
    `select count(*) from private.extraction_usage where owner_id='${a.user.id}';`,
  );
let stopped = false;
try {
  await worker("stop");
  stopped = true;
  const a = await account(),
    b = await account();
  const doc = await create(a);
  const empty = await create(b);
  await json(await new BrowserSession().request(base(doc)), 401);
  await json(
    await a.jar.request(base(doc), {
      method: "POST",
      originHeader: "https://invalid.example",
      body: { text: "ficticio", requestId: randomUUID() },
    }),
    403,
  );
  await upload(
    a,
    doc,
    Buffer.from("not an image"),
    "image/jpeg",
    randomUUID(),
    400,
  );
  await upload(a, doc, audio(61), "audio/wav", randomUUID(), 400);
  assert.equal(await count(a), "0");
  await pass(
    "sesión, origen, formato y duración real se comprueban antes de consumir cuota",
  );
  const requestId = randomUUID();
  const same = await Promise.all(
    Array.from({ length: 6 }, () => text(a, doc, requestId)),
  );
  assert.equal(new Set(same.map((x) => x.id)).size, 1);
  assert.equal(await count(a), "1");
  const id = same[0].id;
  const started = (await get(a, `/api/private/documents/${doc.id}`)).document;
  assert.ok(started.draft_expires_at);
  assert.ok(Date.parse(started.draft_expires_at) - Date.now() > 86340000);
  assert.ok(Date.parse(started.draft_expires_at) - Date.now() < 86460000);
  await pass(
    "seis solicitudes concurrentes crean un único trabajo y una única cuota; el primer dato inicia el plazo",
  );
  await get(b, base(doc), 404);
  await post(
    b,
    `${base(empty)}/apply`,
    { jobId: id, keys: ["tensio_actual"], revision: 0 },
    404,
  );
  assert.equal(
    (await b.client.from("document_extractions").select("id").eq("id", id)).data
      .length,
    0,
  );
  assert.ok(
    (
      await a.client
        .from("document_extractions")
        .update({ state: "ready" })
        .eq("id", id)
    ).error,
  );
  assert.ok(
    (
      await a.client.rpc("begin_extraction", {
        p_owner: a.user.id,
        p_session: randomUUID(),
        p_document: doc.id,
        p_request: randomUUID(),
        p_kind: "text",
        p_mime: "text/plain",
        p_sha: "a".repeat(64),
        p_text: "falso",
        p_seconds: 0,
        p_locale: "es",
      })
    ).error,
  );
  assert.ok((await a.client.rpc("claim_extraction")).error);
  await pass(
    "RLS aísla resultados y clientes no crean cuotas, alteran trabajos ni suplantan al worker",
  );
  let current = (
    await post(a, `/api/private/documents/${doc.id}/fields`, {
      fields: { tensio_actual: "230", local_numero: "" },
      revision: 0,
    })
  ).document;
  const job = await rpc("claim_extraction");
  assert.equal(job.id, id);
  assert.deepEqual(await rpc("claim_brie_job"), []);
  await finish(
    job,
    [
      proposal("tensio_actual", "400"),
      proposal("local_numero", "7"),
      proposal("local_municipi", "Reus"),
      proposal("potencia_maxima", "6'928", true),
    ],
    null,
    ["Potencia sin unidad; revisar"],
  );
  await post(
    a,
    `${base(doc)}/apply`,
    { jobId: id, keys: ["local_municipi"], revision: 0 },
    409,
  );
  for (const key of ["tensio_actual", "local_numero", "potencia_maxima"])
    await post(
      a,
      `${base(doc)}/apply`,
      { jobId: id, keys: [key], revision: current.revision },
      409,
    );
  current = (
    await post(a, `${base(doc)}/apply`, {
      jobId: id,
      keys: ["local_municipi"],
      revision: current.revision,
    })
  ).document;
  assert.equal(current.work_data.tensio_actual, "230");
  assert.equal(current.work_data.local_numero, "");
  assert.equal(current.work_data.local_municipi, "Reus");
  assert.equal(current.work_data.potencia_maxima, undefined);
  await post(
    a,
    `${base(doc)}/apply`,
    { jobId: id, keys: ["local_municipi"], revision: current.revision },
    409,
  );
  await pass(
    "revisión explícita y versión exacta: no sobrescribe valores manuales, vaciados, propuestas dudosas ni campos ya aceptados",
  );
  const photoIds = [];
  for (let i = 0; i < 5; i++)
    photoIds.push((await upload(a, doc, photo, "image/png")).id);
  await upload(a, doc, photo, "image/png", randomUUID(), 429);
  const sourceUrl = `${base(doc)}/source?job=${photoIds[0]}`;
  assert.equal((await a.jar.request(sourceUrl)).status, 200);
  assert.equal((await b.jar.request(sourceUrl)).status, 404);
  const path = await sql(
    `select object_path from public.document_extractions where id='${photoIds[0]}';`,
  );
  assert.ok(
    (
      await a.client.storage
        .from("sources")
        .update(path, photo, { contentType: "image/png" })
    ).error,
  );
  assert.equal(
    (await a.client.storage.from("sources").createSignedUrl(path, 60)).data
      ?.signedUrl,
    undefined,
  );
  await pass(
    "cinco fotos por documento, origen privado y autenticado; otra cuenta, reemplazos y enlaces firmados bloqueados",
  );
  let retry = await rpc("claim_extraction");
  assert.ok(photoIds.includes(retry.id));
  await finish(retry, [], "ai_permission");
  const used = await count(a);
  await post(a, base(doc), { retry: retry.id });
  retry = await rpc("claim_extraction");
  assert.equal(retry.attempts, 2);
  await finish(retry, [], null, ["Imagen ilegible: completar manualmente"]);
  assert.equal(await count(a), used);
  while (true) {
    const j = await rpc("claim_extraction");
    if (!j) break;
    assert.ok(photoIds.includes(j.id));
    await finish(j);
  }
  await pass(
    "fallo de proveedor e imagen ilegible recuperables; reintento del mismo trabajo no vuelve a consumir cuota",
  );
  const cie = await create(a, "CIE");
  const cieId = (await text(a, cie, randomUUID(), "Caso ficticio CIE")).id;
  const cieCatalog = JSON.parse(
    await readFile("shared/extraction/catalog.json", "utf8"),
  ).CIE;
  const municipality = cieCatalog.find((f) => f.key === "TXT_Poblacio_3");
  assert.ok(municipality);
  const cj = await rpc("claim_extraction");
  assert.equal(cj.id, cieId);
  await finish(cj, [proposal(municipality.key, "Reus")]);
  const applied = (
    await post(a, `${base(cie)}/apply`, {
      jobId: cieId,
      keys: [municipality.key],
      revision: 0,
    })
  ).document;
  assert.equal(applied.work_data[municipality.key], "Reus");
  await pass(
    "el adaptador y la aceptación de propuestas funcionan también con el CIE y su esquema propio",
  );
  await text(a, doc);
  await post(
    a,
    `/api/private/documents/${doc.id}/preview`,
    { revision: current.revision },
    202,
  );
  const pdf = (await rpc("claim_brie_job"))[0];
  assert.ok(pdf);
  assert.equal(await rpc("claim_extraction"), null);
  await rpc("finish_brie_job", {
    p_job: pdf.id,
    p_claim: pdf.claim,
    p_sha: null,
    p_errors: ["fixture"],
  });
  const afterPdf = await rpc("claim_extraction");
  assert.ok(afterPdf);
  await finish(afterPdf);
  await pass(
    "los trabajos PDF y de IA comparten exclusión: solo se reclama un trabajo pesado simultáneo",
  );
  const c = await account(),
    c1 = await create(c),
    c2 = await create(c);
  for (let i = 0; i < 5; i++)
    await upload(c, i < 3 ? c1 : c2, audio(60), "audio/wav");
  await upload(c, c2, audio(1), "audio/wav", randomUUID(), 429);
  assert.equal(
    await sql(
      `select sum(seconds) from private.extraction_usage where owner_id='${c.user.id}';`,
    ),
    "300",
  );
  await pass(
    "cinco minutos diarios de audio se aplican entre documentos y no dependen de datos declarados por el navegador",
  );
  const d = await account(),
    d1 = await create(d);
  for (let i = 0; i < 5; i++) await upload(d, d1, audio(1), "audio/wav");
  await upload(d, d1, audio(1), "audio/wav", randomUUID(), 429);
  for (let i = 0; i < 5; i++) await text(d, d1);
  await sql(
    `update private.extraction_usage set created_at=now()-interval '1 day' where owner_id='${d.user.id}';`,
  );
  await post(d, base(d1), { text: "otra", requestId: randomUUID() }, 429);
  await pass(
    "cinco audios y diez extracciones por documento se conservan aunque cambie el día",
  );
  const b2 = await create(b);
  for (let i = 0; i < 10; i++) await text(b, i < 7 ? empty : b2);
  const b3 = await create(b);
  await post(b, base(b3), { text: "otra", requestId: randomUUID() }, 429);
  await sql(
    `insert into private.evaluation_clocks(owner_id,offset_seconds) values('${b.user.id}',172800);`,
  );
  await post(b, base(b3), { text: "otra", requestId: randomUUID() }, 429);
  await get(b, base(empty), 404);
  await pass(
    "diez extracciones diarias entre documentos; el reloj documental no reinicia la cuota real ni permite operar sobre borradores vencidos",
  );
  // Exercise the same closure trigger used by the transactional validation path, without fabricating a paid PDF.
  await sql(
    `update public.documents set status='validated',validated_at=now(),work_data='{}' where id='${doc.id}';`,
  );
  assert.equal(
    await sql(
      `select count(*) from public.document_extractions where document_id='${doc.id}';`,
    ),
    "0",
  );
  assert.equal((await a.jar.request(sourceUrl)).status, 404);
  assert.equal(
    await sql(
      `select count(*) from private.validation_cleanup where bucket='sources' and object_path='${path}';`,
    ),
    "1",
  );
  assert.equal(await count(a), "8");
  await pass(
    "cerrar el documento retira resultados, texto y transcripciones, encola las fotos para borrado y conserva solo los contadores mínimos",
  );
  await writeFile(
    `${dir}/integration.json`,
    `${JSON.stringify(
      {
        pass: true,
        complete: true,
        groups: results.length,
        transport:
          "SQL worker fixtures; real Auth/PostgreSQL/Storage and web API; no external model calls",
        results,
      },
      null,
      2,
    )}\n`,
  );
  console.log(`${results.length} grupos de fase 7 superados.`);
} finally {
  if (accounts.length)
    await sql(
      `delete from auth.users where id in (${accounts.map((a) => `'${a.user.id}'`).join(",")}) and email like 'phase7-%@example.invalid';`,
    );
  if (stopped) await worker("start");
}
