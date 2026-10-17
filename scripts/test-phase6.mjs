import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { reviewToken, verifyReview } from "../src/modules/credits/review.ts";
import { BrowserSession, emailToken, env, json } from "./auth-test-client.mjs";

const dir = process.env.PHASE6_REPORT_DIR || "evidence/phase-6";
await mkdir(dir, { recursive: true });
process.env.AUTH_PROOF_SECRET = env.AUTH_PROOF_SECRET;
const results = [];
async function pass(test) {
  results.push({ test, pass: true });
  console.log("PASS", test);
  await writeFile(
    `${dir}/integration.json`,
    JSON.stringify({ pass: false, complete: false, results }, null, 2),
  );
}
const get = async (j, p, s = 200) => json(await j.request(p), s);
const post = async (j, p, b, s = 200) =>
  json(await j.request(p, { method: "POST", body: b }), s);
const sql = async (query) =>
  new Promise((resolve, reject) => {
    const p = spawn(
      "docker",
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
      { stdio: ["pipe", "pipe", "pipe"] },
    );
    let out = "";
    p.stdout.on("data", (v) => {
      out += v;
    });
    p.stderr.resume();
    p.on("error", reject);
    p.on("exit", (c) =>
      c === 0 ? resolve(out.trim()) : reject(Error("fixture SQL fallida")),
    );
    p.stdin.end(query);
  });
async function account() {
  const jar = new BrowserSession(),
    email = `phase6-${randomUUID()}@example.invalid`,
    password = randomUUID();
  await post(jar, "/api/auth/signup", { email, password });
  const pending = await sql(
    `select count(*) from public.credit_accounts a join auth.users u on u.id=a.owner_id where u.email='${email}';`,
  );
  assert.equal(pending, "0");
  await post(jar, "/api/auth/confirm", {
    token_hash: await emailToken(email, "email"),
    type: "email",
  });
  const user = await get(jar, "/api/auth/session");
  assert.match(user.id, /^[0-9a-f-]{36}$/);
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
  return { jar, email, password, user, client, session };
}
const a = await account(),
  b = await account();
for (const x of [a, b]) {
  const wallet = await get(x.jar, "/api/private/credits");
  assert.equal(wallet.balance, 10);
  assert.equal(wallet.movements.length, 1);
  assert.equal(wallet.movements[0].amount, 10);
}
await post(a.jar, "/api/auth/logout", {});
await post(a.jar, "/api/auth/login", { email: a.email, password: a.password });
assert.equal((await get(a.jar, "/api/private/credits")).balance, 10);
// Refresh the direct client too: assertions below must use the current active session.
const currentEncoded = [...a.jar.cookies]
  .filter(([k]) => /-auth-token(?:\.\d+)?$/.test(k))
  .sort(([x], [y]) => x.localeCompare(y))
  .map(([, v]) => decodeURIComponent(v))
  .join("");
a.session = JSON.parse(
  Buffer.from(currentEncoded.replace(/^base64-/, ""), "base64url").toString(),
);
a.client = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { headers: { Authorization: `Bearer ${a.session.access_token}` } },
});
// Repeated confirmation updates must not award another welcome grant.
await sql(
  `update auth.users set email_confirmed_at=email_confirmed_at where id='${a.user.id}';`,
);
assert.equal((await get(a.jar, "/api/private/credits")).movements.length, 1);
await pass(
  "10 KC solo tras confirmar correo; confirmación repetida y nuevo acceso no duplican la concesión",
);
for (const table of [
  "credit_accounts",
  "credit_movements",
  "validated_documents",
]) {
  assert.deepEqual(
    (await a.client.from(table).select("*").eq("owner_id", b.user.id)).data,
    [],
  );
  assert.ok(
    (
      await a.client
        .from(table)
        .update({ owner_id: b.user.id })
        .eq("owner_id", a.user.id)
    ).error,
  );
  assert.ok(
    (await a.client.from(table).delete().eq("owner_id", a.user.id)).error,
  );
}
assert.ok(
  (
    await a.client
      .from("credit_accounts")
      .insert({ owner_id: a.user.id, balance: 999 })
  ).error,
);
assert.ok(
  (
    await a.client.rpc("validate_document", {
      p_owner: a.user.id,
      p_session: randomUUID(),
      p_document: randomUUID(),
      p_revision: 0,
      p_sha: "a".repeat(64),
    })
  ).error,
);
for (const rpc of ["validation_cleanup_tasks", "claim_brie_job"])
  assert.ok((await a.client.rpc(rpc)).error);
const grants = await sql(
  `select has_function_privilege('boletin_worker','public.validate_document(uuid,uuid,uuid,integer,text)','execute')||','||has_table_privilege('boletin_credits_api','public.credit_accounts','update')||','||has_function_privilege('boletin_credits_api','public.create_document(text,text)','execute');`,
);
assert.equal(grants, "false,false,false");
await get(new BrowserSession(), "/api/private/credits", 401);
await pass(
  "RLS separa saldos y movimientos; clientes y worker no pueden cobrar ni modificar saldo; credencial de créditos con permisos mínimos",
);
async function create(x, type) {
  return (
    await post(
      x.jar,
      "/api/private/documents",
      { type, title: `${type} ficticio créditos` },
      201,
    )
  ).document;
}
async function prepared(x, doc) {
  const path = `/api/private/documents/${doc.id}`;
  await post(x.jar, `${path}/preview`, { revision: doc.revision }, 202);
  for (let i = 0; i < 100; i++) {
    const { preview } = await get(x.jar, `${path}/preview`);
    if (preview?.status === "failed") return { doc, failed: preview };
    if (preview?.status === "ready") {
      const r = await x.jar.request(
        `${path}/preview/file?revision=${doc.revision}`,
      );
      assert.equal(r.status, 200);
      const receipt = r.headers.get("X-Boletin-Review");
      assert.ok(receipt);
      const bytes = Buffer.from(await r.arrayBuffer());
      assert.equal(
        createHash("sha256").update(bytes).digest("hex"),
        preview.sha256,
      );
      return { doc, receipt, bytes, sha256: preview.sha256 };
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw Error("PDF no preparado");
}
async function validate(x, p, status = 200) {
  return post(
    x.jar,
    `/api/private/documents/${p.doc.id}/validate`,
    { reviewToken: p.receipt },
    status,
  );
}
let first = await create(a, "BRIE");
await post(a.jar, "/api/private/profile", {
  fields: { empresa_nom: "PERFIL FICTICIO CONSERVADO" },
  revision: 0,
});
let p = await prepared(a, first);
await post(a.jar, `/api/private/documents/${first.id}/validate`, {}, 409);
await post(
  a.jar,
  `/api/private/documents/${first.id}/validate`,
  { reviewToken: p.receipt, price: 0 },
  400,
);
await json(
  await a.jar.request(`/api/private/documents/${first.id}/validate`, {
    method: "POST",
    body: { reviewToken: p.receipt },
    originHeader: "https://foreign.invalid",
  }),
  403,
);
await validate(b, p, 404);
await post(
  a.jar,
  `/api/private/documents/${first.id}/validate`,
  { reviewToken: `${p.receipt.slice(0, -1)}z` },
  409,
);
const review = verifyReview(p.receipt);
await post(
  a.jar,
  `/api/private/documents/${first.id}/validate`,
  { reviewToken: reviewToken(review, Date.now() - 1900000) },
  409,
);
await post(
  a.jar,
  `/api/private/documents/${first.id}/validate`,
  { reviewToken: reviewToken({ ...review, session: randomUUID() }) },
  409,
);
assert.equal((await get(a.jar, "/api/private/credits")).balance, 10);
await pass(
  "sin revisión, firma alterada, origen ajeno, coste inventado, otra cuenta, otra sesión y revisión caducada se rechazan sin cobro",
);
// A new saved revision invalidates the previously reviewed PDF.
first = (
  await post(a.jar, `/api/private/documents/${first.id}/fields`, {
    fields: { empresa_nom: "REVISIÓN NUEVA FICTICIA" },
    revision: first.revision,
  })
).document;
await validate(a, p, 409);
p = await prepared(a, first);
await json(
  await a.jar.request(`/api/private/documents/${first.id}/files`, {
    method: "POST",
    body: p.bytes,
    headers: { "Content-Type": "application/pdf" },
  }),
  201,
);
const source = (await get(a.jar, `/api/private/documents/${first.id}`))
  .files[0];
assert.ok(source.id);
const paths = JSON.parse(
  await sql(
    `select json_build_object('source',(select object_path from public.document_files where id='${source.id}'),'pdf',(select object_path from public.document_previews where document_id='${first.id}' and revision=${first.revision}));`,
  ),
);
// Simulate corrupt metadata on this run's fictitious draft: the server must verify the actual bytes again.
await sql(
  `update public.document_previews set sha256='${"0".repeat(64)}' where document_id='${first.id}' and revision=${first.revision};`,
);
await post(
  a.jar,
  `/api/private/documents/${first.id}/validate`,
  {
    reviewToken: reviewToken({
      ...verifyReview(p.receipt),
      sha256: "0".repeat(64),
    }),
  },
  409,
);
assert.equal((await get(a.jar, "/api/private/credits")).balance, 10);
await sql(
  `update public.document_previews set sha256='${p.sha256}' where document_id='${first.id}' and revision=${first.revision};`,
);
await pass(
  "editar invalida la revisión anterior; un PDF cuyo hash no coincide no genera cargo",
);
// Isolate database transaction concurrency from the external Auth request limit.
// This trusted fixture uses the same restricted server role and genuinely reviewed PDF.
const creditsEnv = await readFile(".secrets/credits.env", "utf8");
const creditsKey = creditsEnv.trim().slice("CREDITS_API_KEY=".length);
const initial = verifyReview(p.receipt);
const transactions = await Promise.all(
  Array.from({ length: 8 }, async () => {
    const response = await fetch(
      `${env.SUPABASE_URL}/rest/v1/rpc/validate_document`,
      {
        method: "POST",
        headers: {
          apikey: env.SUPABASE_ANON_KEY,
          Authorization: `Bearer ${creditsKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          p_owner: initial.owner,
          p_session: initial.session,
          p_document: initial.document,
          p_revision: initial.revision,
          p_sha: initial.sha256,
        }),
        signal: AbortSignal.timeout(30000),
      },
    );
    assert.equal(response.status, 200, "transacción de créditos");
    return response.json();
  }),
);
assert.equal(transactions.filter((r) => !r.alreadyValidated).length, 1);
assert.ok(transactions.every((r) => r.balance === 8));
await pass(
  "ocho transacciones simultáneas con el rol restringido: exactamente un cierre y un cargo de 2 KC",
);
const duplicate = await Promise.all(
  Array.from({ length: 2 }, () =>
    a.jar.request(`/api/private/documents/${first.id}/validate`, {
      method: "POST",
      body: { reviewToken: p.receipt },
    }),
  ),
);
for (const r of duplicate) {
  assert.ok(
    [200, 409, 503].includes(r.status),
    `validación concurrente ${r.status}`,
  );
  await r.arrayBuffer();
}
// A transient Auth timeout is recoverable, never a duplicate financial operation.
const responseCounts = Object.fromEntries(
  [200, 409, 503].map((status) => [
    status,
    duplicate.filter((r) => r.status === status).length,
  ]),
);
for (let i = 0; i < duplicate.length; i++) await validate(a, p);
const repeated = await validate(a, p);
assert.equal(repeated.alreadyValidated, true);
assert.equal(repeated.balance, 8);
assert.equal(repeated.artifact.cost, 2);
let wallet = await get(a.jar, "/api/private/credits");
assert.equal(wallet.balance, 8);
assert.equal(
  wallet.movements.filter((m) => m.document_id === first.id).length,
  1,
);
const frozen = await get(a.jar, `/api/private/documents/${first.id}`);
assert.equal(frozen.document.status, "validated");
assert.deepEqual(frozen.document.work_data, {});
assert.deepEqual(frozen.files, []);
await post(
  a.jar,
  `/api/private/documents/${first.id}/fields`,
  { fields: {}, revision: first.revision },
  409,
);
await post(
  a.jar,
  `/api/private/documents/${first.id}/preview`,
  { revision: first.revision },
  409,
);
await get(
  a.jar,
  `/api/private/documents/${first.id}/preview/file?revision=${first.revision}`,
  404,
);
assert.equal(
  (await get(a.jar, "/api/private/profile")).profile.fields.empresa_nom,
  "PERFIL FICTICIO CONSERVADO",
);
await pass(
  "doble clic HTTP y reintentos conservan un solo cargo BRIE: 10→8 KC; documento cerrado y perfil conservado",
);
const final = await a.jar.request(`/api/private/documents/${first.id}/pdf`);
assert.equal(final.status, 200);
assert.match(final.headers.get("content-disposition"), /^attachment/);
assert.match(final.headers.get("cache-control"), /no-store/);
const bytes = Buffer.from(await final.arrayBuffer());
assert.ok(bytes.equals(p.bytes));
const inline = await a.jar.request(
  `/api/private/documents/${first.id}/pdf?view=1`,
);
assert.equal(inline.status, 200);
assert.match(inline.headers.get("content-disposition"), /^inline/);
await inline.arrayBuffer();
await get(b.jar, `/api/private/documents/${first.id}/pdf`, 404);
await get(new BrowserSession(), `/api/private/documents/${first.id}/pdf`, 401);
assert.ok((await b.client.storage.from("previews").download(paths.pdf)).error);
assert.ok(
  (
    await a.client.storage.from("previews").upload(paths.pdf, bytes, {
      contentType: "application/pdf",
      upsert: true,
    })
  ).error,
);
await pass(
  "descarga e impresión conservan exactamente los bytes revisados; acceso ajeno, anónimo y sustitución del PDF bloqueados",
);
for (let i = 0; i < 60; i++) {
  const count = await sql(
    `select (select count(*) from private.pdf_jobs where document_id='${first.id}')+(select count(*) from storage.objects where bucket_id='documents' and name='${paths.source}')+(select count(*) from private.validation_cleanup where object_path='${paths.source}');`,
  );
  if (count === "0") break;
  if (i === 59) throw Error("limpieza no terminada");
  await new Promise((r) => setTimeout(r, 1000));
}
assert.ok(
  (await a.client.storage.from("documents").download(paths.source)).error,
);
assert.equal(
  await sql(
    `select count(*) from storage.objects where bucket_id='previews' and name='${paths.pdf}';`,
  ),
  "1",
);
await pass(
  "worker elimina fuentes y cola con datos de trabajo; el PDF final queda excluido de la limpieza",
);
const cie = await prepared(a, await create(a, "CIE"));
const cieresult = await validate(a, cie);
assert.equal(cieresult.balance, 3);
assert.equal(cieresult.artifact.cost, 5);
const insufficient = await prepared(a, await create(a, "CIE"));
assert.equal(
  (await validate(a, insufficient, 402)).error,
  "insufficient_credits",
);
assert.equal((await get(a.jar, "/api/private/credits")).balance, 3);
assert.equal(
  (await get(a.jar, `/api/private/documents/${insufficient.doc.id}`)).document
    .status,
  "draft",
);
await pass(
  "CIE descuenta 5 KC: 8→3; saldo insuficiente conserva borrador y saldo, sin movimiento de cargo",
);
// Three concurrent documents compete for a single 10 KC wallet.
const competing = [];
for (let i = 0; i < 3; i++)
  competing.push(await prepared(b, await create(b, "CIE")));
const charged = await Promise.all(
  competing.map((v) =>
    b.jar.request(`/api/private/documents/${v.doc.id}/validate`, {
      method: "POST",
      body: { reviewToken: v.receipt },
    }),
  ),
);
assert.deepEqual(charged.map((r) => r.status).sort(), [200, 200, 402]);
for (const r of charged) await r.arrayBuffer();
wallet = await get(b.jar, "/api/private/credits");
assert.equal(wallet.balance, 0);
assert.equal(wallet.movements.filter((m) => m.kind === "validation").length, 2);
assert.equal(
  wallet.movements.reduce((sum, m) => sum + m.amount, 0),
  wallet.balance,
);
await pass(
  "tres CIE concurrentes con 10 KC: dos cargos y un rechazo; saldo final 0 sin valores negativos",
);
let failed = await create(a, "BRIE");
failed = (
  await post(a.jar, `/api/private/documents/${failed.id}/fields`, {
    fields: { local_cp: "X".repeat(100) },
    revision: failed.revision,
  })
).document;
const bad = await prepared(a, failed);
assert.equal(bad.failed.status, "failed");
const noPdf = reviewToken({
  ...verifyReview(insufficient.receipt),
  document: failed.id,
  revision: failed.revision,
});
await post(
  a.jar,
  `/api/private/documents/${failed.id}/validate`,
  { reviewToken: noPdf },
  409,
);
assert.equal((await get(a.jar, "/api/private/credits")).balance, 3);
await pass(
  "fallo de generación y ausencia de PDF listo nunca descuentan créditos",
);
const totals = await sql(
  `select count(*) from public.credit_accounts a where a.owner_id in ('${a.user.id}','${b.user.id}') and a.balance<>(select coalesce(sum(amount),0) from public.credit_movements m where m.owner_id=a.owner_id);`,
);
assert.equal(totals, "0");
await writeFile(
  `${dir}/integration.json`,
  JSON.stringify(
    {
      pass: true,
      complete: true,
      groups: results.length,
      concurrentResponses: responseCounts,
      results,
    },
    null,
    2,
  ),
);
console.log(`${results.length} grupos de fase 6 superados.`);
