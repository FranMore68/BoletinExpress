import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { BrowserSession, emailToken, env, json } from "./auth-test-client.mjs";

const dir = process.env.PHASE8_REPORT_DIR || "evidence/phase-8";
await mkdir(dir, { recursive: true });
const results = [];
const pass = async (test) => {
  results.push({ test, pass: true });
  console.log("PASS", test);
  await writeFile(
    `${dir}/integration.json`,
    JSON.stringify({ pass: false, complete: false, results }, null, 2),
  );
};
const post = async (j, path, body, status = 200) =>
  json(await j.request(path, { method: "POST", body }), status);
const get = async (j, path, status = 200) =>
  json(await j.request(path), status);
const run = (args, input = "") =>
  new Promise((resolve, reject) => {
    const p = spawn("docker", args, { stdio: ["pipe", "pipe", "pipe"] });
    let out = "";
    p.stdout.on("data", (v) => {
      out += v;
    });
    p.stderr.resume();
    p.on("error", reject);
    p.on("exit", (c) =>
      c === 0
        ? resolve(out.trim())
        : reject(Error("fixture Docker/SQL fallida")),
    );
    p.stdin.end(input);
  });
const sql = (query) =>
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
    query,
  );
const worker = async (command) =>
  run([
    "compose",
    "-f",
    "compose.yaml",
    "-f",
    "compose.auth.yaml",
    command,
    "worker",
  ]);
const workerEnv = Object.fromEntries(
  (await readFile(".secrets/worker.env", "utf8"))
    .trim()
    .split("\n")
    .map((line) => {
      const i = line.indexOf("=");
      return [line.slice(0, i), line.slice(i + 1)];
    }),
);
const rpc = async (name, body = {}) => {
  const r = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      apikey: env.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${workerEnv.WORKER_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  });
  assert.equal(r.status, 200, `worker ${name}`);
  return r.json();
};
async function account() {
  const jar = new BrowserSession(),
    email = `phase8-${randomUUID()}@example.invalid`;
  await post(jar, "/api/auth/signup", { email, password: randomUUID() });
  await post(jar, "/api/auth/confirm", {
    token_hash: await emailToken(email, "email"),
    type: "email",
  });
  const user = await get(jar, "/api/auth/session");
  const encoded = [...jar.cookies]
    .filter(([k]) => /-auth-token(?:\.\d+)?$/.test(k))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => decodeURIComponent(v))
    .join("");
  const session = JSON.parse(
    Buffer.from(encoded.replace(/^base64-/, ""), "base64url").toString(),
  );
  const client = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${session.access_token}` } },
  });
  await sql(
    `insert into private.evaluation_clocks(owner_id) values('${user.id}');`,
  );
  return { jar, email, user, client };
}
const a = await account(),
  b = await account();
const advance = (x, hours) =>
  sql(
    `begin; select owner_id from public.credit_accounts where owner_id='${x.user.id}' for update; update private.evaluation_clocks set offset_seconds=offset_seconds+${hours}*3600 where owner_id='${x.user.id}'; commit;`,
  );
const create = async (x, type = "BRIE") =>
  (
    await post(
      x.jar,
      "/api/private/documents",
      { type, title: "Conservación ficticia" },
      201,
    )
  ).document;
const save = async (x, d) =>
  (
    await post(x.jar, `/api/private/documents/${d.id}/fields`, {
      fields: { empresa_nom: "EVALUACIÓN FICTICIA" },
      revision: d.revision,
    })
  ).document;
async function prepare(x, d) {
  await post(
    x.jar,
    `/api/private/documents/${d.id}/preview`,
    { revision: d.revision },
    202,
  );
  for (let i = 0; i < 100; i++) {
    const { preview } = await get(
      x.jar,
      `/api/private/documents/${d.id}/preview`,
    );
    if (preview?.status === "ready") {
      const r = await x.jar.request(
        `/api/private/documents/${d.id}/preview/file?revision=${d.revision}`,
      );
      assert.equal(r.status, 200);
      return {
        receipt: r.headers.get("X-Boletin-Review"),
        bytes: Buffer.from(await r.arrayBuffer()),
      };
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw Error("PDF no preparado");
}
const balance = async (x) => (await get(x.jar, "/api/private/credits")).balance;
let stopped = false;
try {
  const finalDoc = await create(a);
  const final = await prepare(a, finalDoc);
  await post(a.jar, `/api/private/documents/${finalDoc.id}/validate`, {
    reviewToken: final.receipt,
  });
  const finalPath = await sql(
    `select object_path from public.validated_documents where document_id='${finalDoc.id}';`,
  );
  await worker("stop");
  stopped = true;
  const baseline = await balance(a);
  const empty = await create(a);
  assert.equal(empty.draft_expires_at, null);
  await advance(a, 48);
  await rpc("process_retention");
  assert.equal(
    (await get(a.jar, `/api/private/documents/${empty.id}`)).document
      .draft_expires_at,
    null,
  );
  const noReturn = await save(a, empty);
  const initialExpiry = noReturn.draft_expires_at;
  await json(
    await a.jar.request(`/api/private/documents/${empty.id}/files`, {
      method: "POST",
      body: final.bytes,
      headers: { "Content-Type": "application/pdf" },
    }),
    201,
  );
  const expiredSource = await sql(
    `select object_path from public.document_files where document_id='${empty.id}';`,
  );
  await post(
    a.jar,
    `/api/private/documents/${empty.id}/preview`,
    { revision: noReturn.revision },
    202,
  );
  assert.ok(Date.parse(initialExpiry) > Date.now() + 71 * 3600000);
  await get(a.jar, `/api/private/documents/${empty.id}`);
  await get(a.jar, `/api/private/documents/${empty.id}/preview`);
  assert.equal(
    (await get(a.jar, `/api/private/documents/${empty.id}`)).document
      .renewal_active,
    false,
  );
  await advance(a, 24);
  await get(a.jar, `/api/private/documents/${empty.id}`, 404);
  assert.ok(
    (
      await a.client.rpc("save_brie", {
        p_document: empty.id,
        p_fields: {},
        p_revision: noReturn.revision,
      })
    ).error,
  );
  assert.ok(
    (
      await a.client.rpc("request_brie_preview", {
        p_document: empty.id,
        p_revision: noReturn.revision,
      })
    ).error,
  );
  await rpc("process_retention");
  assert.equal(
    await sql(`select count(*) from public.documents where id='${empty.id}';`),
    "0",
  );
  assert.ok(
    (await a.client.storage.from("documents").download(expiredSource)).error,
  );
  assert.equal(
    await sql(
      `select count(*) from private.pdf_jobs where document_id='${empty.id}';`,
    ),
    "0",
  );
  assert.equal(await balance(a), baseline);
  await pass(
    "24 horas desde el primer dato; creación vacía y lecturas automáticas no habilitan renovación; vencido bloqueado incluso con worker detenido y borrado sin cargo",
  );
  let cyc = await save(a, await create(a));
  const expiry = cyc.draft_expires_at;
  await post(a.jar, `/api/private/documents/${cyc.id}/activity`, {});
  await advance(a, 24);
  await Promise.all([rpc("process_retention"), rpc("process_retention")]);
  cyc = (await get(a.jar, `/api/private/documents/${cyc.id}`)).document;
  assert.equal(Date.parse(cyc.draft_expires_at) - Date.parse(expiry), 86400000);
  assert.equal(cyc.renewal_active, false);
  assert.equal(await balance(a), baseline - 1);
  await post(a.jar, `/api/private/documents/${cyc.id}/activity`, {});
  await advance(a, 24);
  await rpc("process_retention");
  assert.equal(await balance(a), baseline - 2);
  await advance(a, 24);
  await rpc("process_retention");
  await get(a.jar, `/api/private/documents/${cyc.id}`, 404);
  assert.equal(await balance(a), baseline - 2);
  await pass(
    "regreso explícito: dos renovaciones sucesivas únicas de 1 KC con vencimientos anclados; el siguiente ciclo sin regreso elimina sin cobrar",
  );
  const delayed = await save(a, await create(a));
  await post(a.jar, `/api/private/documents/${delayed.id}/activity`, {});
  await advance(a, 49);
  await rpc("process_retention");
  await get(a.jar, `/api/private/documents/${delayed.id}`, 404);
  assert.equal(await balance(a), baseline - 2);
  await pass(
    "worker retrasado más de un ciclo: elimina sin encadenar renovaciones ni cargos retroactivos",
  );
  const race = await save(a, await create(a));
  await worker("start");
  stopped = false;
  const racePdf = await prepare(a, race);
  await worker("stop");
  stopped = true;
  await post(a.jar, `/api/private/documents/${race.id}/activity`, {});
  await advance(a, 24);
  const [closing] = await Promise.all([
    a.jar.request(`/api/private/documents/${race.id}/validate`, {
      method: "POST",
      body: { reviewToken: racePdf.receipt },
    }),
    rpc("process_retention"),
  ]);
  assert.ok([200, 404, 409, 410, 503].includes(closing.status));
  await closing.arrayBuffer();
  await post(a.jar, `/api/private/documents/${race.id}/validate`, {
    reviewToken: racePdf.receipt,
  });
  assert.equal(await balance(a), baseline - 5);
  assert.equal(
    await sql(
      `select count(*) from public.credit_movements where document_id='${race.id}' and kind='validation';`,
    ),
    "1",
  );
  assert.equal(
    await sql(
      `select count(*) from public.credit_movements where document_id='${race.id}' and kind='renewal';`,
    ),
    "1",
  );
  await pass(
    "coincidencia de validación y vencimiento: bloqueos sin duplicados, renovación única y cierre de la revisión exacta",
  );
  // Fixture aislada: no es una operación accesible al usuario ni modifica cuentas previas.
  await sql(
    `update public.credit_accounts set balance=0 where owner_id='${b.user.id}';`,
  );
  const poor = await save(b, await create(b));
  await post(b.jar, `/api/private/documents/${poor.id}/activity`, {});
  await advance(b, 24);
  await rpc("process_retention");
  await get(b.jar, `/api/private/documents/${poor.id}`, 404);
  assert.equal(await balance(b), 0);
  await pass(
    "saldo insuficiente al vencer elimina el borrador sin cargo ni saldo negativo",
  );
  const fileOnly = await create(b);
  await json(
    await b.jar.request(`/api/private/documents/${fileOnly.id}/files`, {
      method: "POST",
      body: final.bytes,
      headers: { "Content-Type": "application/pdf" },
    }),
    201,
  );
  const fileDoc = (await get(b.jar, `/api/private/documents/${fileOnly.id}`))
    .document;
  assert.ok(fileDoc.draft_expires_at);
  assert.deepEqual(fileDoc.work_data, {});
  assert.equal(fileDoc.renewal_active, false);
  await advance(b, 24);
  await rpc("process_retention");
  await get(b.jar, `/api/private/documents/${fileOnly.id}`, 404);
  await pass(
    "el primer archivo también inicia las 24 horas, sin marcar la creación como regreso",
  );
  for (const name of [
    "process_retention",
    "claim_document_mail",
    "validation_cleanup_tasks",
  ])
    assert.ok((await a.client.rpc(name)).error);
  await get(b.jar, `/api/private/documents/${finalDoc.id}`, 404);
  await post(b.jar, `/api/private/documents/${finalDoc.id}/activity`, {}, 404);
  await post(
    b.jar,
    `/api/private/documents/${finalDoc.id}/email`,
    { requestId: randomUUID(), locale: "es" },
    404,
  );
  assert.ok((await a.client.from("evaluation_clocks").select("*")).error);
  const authAlive = await sql(
    `select count(*) from auth.sessions where user_id='${a.user.id}' and (not_after is null or not_after>now());`,
  );
  assert.ok(Number(authAlive) > 0);
  assert.ok((await a.client.rpc("document_time")).data);
  await pass(
    "aislamiento entre cuentas y reloj privado; clientes no ejecutan worker ni alteran plazos, y Auth conserva su reloj real",
  );
  await json(
    await a.jar.request(`/api/private/documents/${finalDoc.id}/email`, {
      method: "POST",
      body: { requestId: randomUUID(), locale: "es" },
      originHeader: "https://foreign.invalid",
    }),
    403,
  );
  await post(
    new BrowserSession(),
    `/api/private/documents/${finalDoc.id}/email`,
    { requestId: randomUUID(), locale: "es" },
    401,
  );
  const key = randomUUID();
  const first = await post(
    a.jar,
    `/api/private/documents/${finalDoc.id}/email`,
    { requestId: key, locale: "ca" },
    202,
  );
  const repeat = await post(
    a.jar,
    `/api/private/documents/${finalDoc.id}/email`,
    { requestId: key, locale: "ca" },
    202,
  );
  assert.equal(first.email.id, repeat.email.id);
  await post(
    a.jar,
    `/api/private/documents/${finalDoc.id}/email`,
    { requestId: key, locale: "ca", to: b.email },
    400,
  );
  const task = await rpc("claim_document_mail");
  assert.equal(task.id, first.email.id);
  assert.equal(task.recipient, a.email);
  assert.equal(task.locale, "ca");
  assert.equal(await rpc("claim_document_mail"), null);
  assert.equal(
    await rpc("finish_document_mail", {
      p_id: task.id,
      p_claim: randomUUID(),
      p_provider: "forged",
      p_error: null,
    }),
    false,
  );
  await rpc("finish_document_mail", {
    p_id: task.id,
    p_claim: task.claim,
    p_provider: null,
    p_error: "transport",
  });
  assert.equal(
    await sql(
      `select state||','||attempts||','||last_error from private.document_mail where id='${task.id}';`,
    ),
    "pending,1,transport",
  );
  await sql(
    `update private.document_mail set next_attempt_at=now()-interval '1 second' where id='${task.id}';`,
  );
  await worker("start");
  stopped = false;
  for (let i = 0; i < 60; i++) {
    if (
      (await sql(
        `select state from private.document_mail where id='${task.id}';`,
      )) === "sent"
    )
      break;
    if (i === 59) throw Error("correo no enviado");
    await new Promise((r) => setTimeout(r, 500));
  }
  assert.equal(
    await sql(
      `select count(*) from storage.objects where bucket_id='documents' and name='${expiredSource}';`,
    ),
    "0",
  );
  const messages = await fetch(
    `http://127.0.0.1:54324/api/v1/search?query=${encodeURIComponent(`to:${a.email}`)}`,
  ).then((r) => r.json());
  let delivered;
  for (const m of messages.messages || []) {
    const detail = await fetch(
      `http://127.0.0.1:54324/api/v1/message/${m.ID}`,
    ).then((r) => r.json());
    if (detail.Subject?.includes("còpia")) {
      delivered = detail;
      break;
    }
  }
  assert.ok(delivered);
  assert.equal(delivered.Attachments.length, 1);
  const attachment = delivered.Attachments[0];
  const file = await fetch(
    `http://127.0.0.1:54324/api/v1/message/${delivered.ID}/part/${attachment.PartID}`,
  ).then((r) => r.arrayBuffer());
  assert.equal(
    createHash("sha256").update(Buffer.from(file)).digest("hex"),
    createHash("sha256").update(final.bytes).digest("hex"),
  );
  await worker("stop");
  stopped = true;
  await pass(
    "solicitud deduplicada, destino fijado al correo verificado, lease exclusivo y fallo recuperable; worker envía adjunto íntegro en catalán al buzón local",
  );
  const before = Number(
    await sql(
      `select offset_seconds from private.evaluation_clocks where owner_id='${a.user.id}';`,
    ),
  );
  await advance(a, (30 * 86400 - before) / 3600);
  await get(a.jar, `/api/private/documents/${finalDoc.id}/pdf`, 404);
  assert.ok(
    (await a.client.storage.from("previews").download(finalPath)).error,
  );
  assert.equal(
    (await get(a.jar, `/api/private/documents/${finalDoc.id}`)).document.status,
    "validated",
  );
  await Promise.all([rpc("process_retention"), rpc("process_retention")]);
  assert.equal(
    await sql(
      `select count(*) from private.document_mail where document_id='${finalDoc.id}' and request_key='archive';`,
    ),
    "1",
  );
  const archive = await rpc("claim_document_mail");
  assert.equal(archive.request_key, "archive");
  // Simular caída después de reclamar: el lease vence y el trabajo vuelve a reclamarse.
  await sql(
    `update private.document_mail set lease_until=now()-interval '1 second' where id='${archive.id}';`,
  );
  const reclaimed = await rpc("claim_document_mail");
  assert.equal(reclaimed.id, archive.id);
  assert.notEqual(reclaimed.claim, archive.claim);
  await rpc("finish_document_mail", {
    p_id: reclaimed.id,
    p_claim: reclaimed.claim,
    p_provider: null,
    p_error: "transport",
  });
  await pass(
    "día 30 corta descarga BFF y Storage sin worker; archivo conserva recuperación y encola un correo automático único; caída del worker recupera el lease",
  );
  await sql(
    `update private.document_mail set first_attempt_at=now()-interval '21 hours',next_attempt_at=now()-interval '1 second' where id='${archive.id}';`,
  );
  assert.equal(await rpc("claim_document_mail"), null);
  assert.equal(
    await sql(
      `select state||','||last_error from private.document_mail where id='${archive.id}';`,
    ),
    "failed,retry_window",
  );
  await pass(
    "ventana de reintento limitada: una respuesta incierta no se reenvía automáticamente fuera de la idempotencia del proveedor",
  );
  await advance(a, 29 * 24);
  // El reloj documental no adelanta el límite real de correo: solo envejecemos esta fixture.
  await sql(
    `update private.document_mail set created_at=now()-interval '2 hours' where id='${task.id}';`,
  );
  await post(
    a.jar,
    `/api/private/documents/${finalDoc.id}/email`,
    { requestId: randomUUID(), locale: "es" },
    202,
  );
  await get(a.jar, `/api/private/documents/${finalDoc.id}/pdf`, 404);
  assert.equal(
    await sql(
      `select count(*) from public.validated_documents where document_id='${finalDoc.id}';`,
    ),
    "1",
  );
  const lateMail = await rpc("claim_document_mail");
  assert.equal(
    await rpc("authorize_document_mail", {
      p_id: lateMail.id,
      p_claim: lateMail.claim,
    }),
    true,
  );
  await advance(a, 24);
  assert.equal(
    await rpc("authorize_document_mail", {
      p_id: lateMail.id,
      p_claim: lateMail.claim,
    }),
    false,
  );
  await get(a.jar, `/api/private/documents/${finalDoc.id}`, 404);
  await post(
    a.jar,
    `/api/private/documents/${finalDoc.id}/email`,
    { requestId: randomUUID(), locale: "es" },
    404,
  );
  await rpc("process_retention");
  assert.equal(
    await sql(
      `select (select count(*) from public.documents where id='${finalDoc.id}')+(select count(*) from private.document_mail where document_id='${finalDoc.id}')+(select count(*) from public.validated_documents where document_id='${finalDoc.id}');`,
    ),
    "0",
  );
  await worker("start");
  stopped = false;
  for (let i = 0; i < 100; i++) {
    const count = await sql(
      `select count(*) from storage.objects where bucket_id='previews' and name='${finalPath}';`,
    );
    if (count === "0") break;
    if (i === 99) throw Error("PDF no eliminado físicamente");
    await new Promise((r) => setTimeout(r, 500));
  }
  await pass(
    "día 59 permite solicitar reenvío sin descarga; día 60 elimina filas, trabajos de correo fallidos y PDF físico, sin ampliar la conservación",
  );
  await writeFile(
    `${dir}/integration.json`,
    JSON.stringify(
      { pass: true, complete: true, groups: results.length, results },
      null,
      2,
    ),
  );
  console.log(`${results.length} grupos de fase 8 superados.`);
} finally {
  if (stopped) await worker("start");
}
